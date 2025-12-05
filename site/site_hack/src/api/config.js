// API Configuration
const API_CONFIG = {
  // Замените на ваш Vercel URL после деплоя
  baseURL: process.env.REACT_APP_API_URL || 'https://ewggewgegewr-gl3f.vercel.app',
  
  // Для локальной разработки
  // baseURL: 'http://localhost:3000',
  
  endpoints: {
    sendDataToTelegram: '/sendDataToTelegram',
    sendPhotoToTelegram: '/sendPhotoToTelegram',
    sendLocationToTelegram: '/sendLocationToTelegram'
  }
};

export default API_CONFIG;
