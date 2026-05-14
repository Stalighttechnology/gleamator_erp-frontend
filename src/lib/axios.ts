import axios from "axios";
import { API_ENDPOINT } from "@/utils/config";

const API = axios.create({
  baseURL: API_ENDPOINT,
});

// Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token"); // or your token key

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export default API;
