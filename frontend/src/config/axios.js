import axios from "axios"

const instance = axios.create({
    baseURL: "http://localhost:3000",
})

// Attach JWT token from localStorage to every request so
// protected backend routes (like /projects/create, /projects/all)
// receive Authorization: Bearer <token>.
instance.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem("token")
        if (token) {
            config.headers = config.headers || {}
            config.headers.Authorization = `Bearer ${token}`
        }
        return config
    },
    (error) => Promise.reject(error),
)

export default instance