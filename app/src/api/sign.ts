import { setAccessToken, api, getGuestId, setGuestId } from './api';
import type { GuestToken, LoginToken, LoginError } from './apiType';

export async function checkSign() {
  try {
    const guestLogin = {
      guestId: getGuestId()
    }
    const response = await api.post<GuestToken>("/user/sign/guest", guestLogin);

    if (!response.result || !response.data) return false;
    const token = response.data.token;
    const guestId = response.data.guestId;
    setAccessToken(token);
    setGuestId(guestId);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function loginAsStudent(email: string, password: string): Promise<{ success: boolean; error?: string; user?: LoginToken['user'] }> {
  try {
    const response = await api.post<LoginToken | LoginError>("/user/sign/login", { email, password });

    if (!response.result || !response.data) {
      return { success: false, error: "로그인에 실패했습니다." };
    }

    // 에러 응답 확인
    if ('error' in response.data) {
      return { success: false, error: response.data.error };
    }

    const data = response.data as LoginToken;
    setAccessToken(data.token);
    localStorage.setItem('koreanUser', JSON.stringify(data.user));
    return { success: true, user: data.user };
  } catch (error) {
    console.error(error);
    return { success: false, error: "서버 연결에 실패했습니다." };
  }
}

export async function migrateGuestData(guestId: string): Promise<boolean> {
  try {
    const response = await api.post("/user/sign/migrate", { guestId });
    return response.result === true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await api.patch("/auth/password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (!response.result) {
      return { success: false, error: "wrong_current" };
    }
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: "server_error" };
  }
}
