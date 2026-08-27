/**
 * 아직 붙지 않은 것을 한곳에서 껐다 켠다.
 *
 * 깃발을 화면마다 두면 갈라진다 — 하나가 켜져도 다른 하나가 남아, 반쪽만
 * 살아난 채로 배포된다. 이 저장소가 가장 자주 어긋난 자리가 그것이다
 * (`free_scope.py` 머리말·`paywall-panel` 의 무료 목록).
 */

/**
 * 비밀번호 재설정 메일을 보낼 수단이 붙었나.
 *
 * **지금은 없다** — `api/` 에 SMTP·SES·SendGrid 어느 것도 없다(BLOCKERS §7).
 * 그래서 메일 링크로만 닿는 두 화면이 갈 곳을 잃었다:
 *
 *   `/new-password`  낡은 링크를 가진 사람은 닿는다 → 폼 대신 사실을 말한다
 *   `/check-email`   "보내드렸습니다" 는 화면인데 **보낸 적이 없다** →
 *                    사실을 말하는 `/reset-password` 로 보낸다
 *
 * 메일이 붙으면 **여기 한 줄만** true 로 바꾸면 둘이 같이 살아난다.
 * `NewPasswordForm` 의 TODO 도 그때 채운다.
 */
export const MAIL_RESET_READY = false;
