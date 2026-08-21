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

    // 토큰이 없으면 실패다. 예전에는 그래도 true 를 냈고, setAccessToken(undefined)
    // 가 문자열 "undefined" 를 저장해서 게스트가 들어온 것처럼 보였다 —
    // 그 뒤로 모든 요청이 Bearer undefined 로 나가 조용히 다 실패한다.
    if (!token) return false;

    setAccessToken(token);
    if (guestId) setGuestId(guestId);
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

    // 토큰이나 사용자가 없으면 성공이 아니다. 넣으면 localStorage 에
    // 문자열 "undefined" 가 남아 앱이 부팅에서 죽는다.
    if (!data.token || !data.user) {
      return { success: false, error: "로그인 응답이 올바르지 않습니다." };
    }

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
