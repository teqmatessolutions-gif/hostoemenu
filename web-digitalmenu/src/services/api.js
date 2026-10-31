// src/services/api.js
import axios from "axios";
import { getApiBaseUrl } from "../utils/env";

// Set your backend API base URL
const API = axios.create({
  baseURL: getApiBaseUrl(),
});

// Automatically add token to headers
API.interceptors.request.use((req) => {
  const token = localStorage.getItem("token");
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export default API;

