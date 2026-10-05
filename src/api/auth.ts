import axios from 'axios';

interface LoginToken {
    token: string;
    expire: number;
}

/** Mint a password-free login token (requires an existing session). */
const requestLoginToken = async (): Promise<LoginToken> => {
    const res = await axios.post('/api/token');
    return res.data;
};

/**
 * Redeem a login token from the URL. Uses plain fetch to bypass the
 * axios interceptors (a failed token must not trigger the global
 * error toast / login redirect loop).
 */
const loginWithToken = async (token: string, expire: string): Promise<void> => {
    const params = new URLSearchParams({ token, expire });
    const res = await fetch(`/api/login?${params.toString()}`, { credentials: 'same-origin' });
    if (!res.ok) {
        throw new Error(`token login failed: ${res.status}`);
    }
};

/** Build a shareable login link, e.g. https://host/?token=..&expire=..#/filemanage */
const buildLoginLink = (token: string, expire: number): string => {
    const params = new URLSearchParams({ token, expire: String(expire) });
    return `${window.location.origin}/?${params.toString()}#/filemanage`;
};

export { requestLoginToken, loginWithToken, buildLoginLink };
export type { LoginToken };
