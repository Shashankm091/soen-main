/**
 * Normalize axios error responses (JSON objects, plain strings, validation arrays).
 */
export function parseApiError(err, fallback = 'Something went wrong.') {
    const d = err.response?.data

    if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
        return 'Cannot reach the server. Is the API running on port 3000?'
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
