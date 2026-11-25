import axios from "axios";

// Создаём общий HTTP-клиент для запросов к Backend
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
