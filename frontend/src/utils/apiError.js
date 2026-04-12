/**
 * Normalize axios error responses (JSON objects, plain strings, validation arrays).
 */
export function parseApiError(err, fallback = 'Something went wrong.') {
    const d = err.response?.data
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        if (isLocalhost) {
            return 'Cannot reach the server. Is the backend API running locally on port 3000?'
        } else {
            return `Production connectivity error. Please check if VITE_API_URL is correctly set in Vercel and that your backend is running.`
        }
    }

    if (d == null || d === '') {
        return err.message || fallback
    }

    if (typeof d === 'string') {
        return d
    }

    if (typeof d.errors === 'string') {
        return d.errors
    }

    if (Array.isArray(d.errors)) {
        return d.errors.map((x) => (typeof x === 'string' ? x : x.msg || String(x))).join(', ')
    }

    if (typeof d.message === 'string') {
        return d.message
    }

    if (typeof d.error === 'string') {
        return d.error
    }

    return fallback
}

