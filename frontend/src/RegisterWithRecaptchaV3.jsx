import React, { useState } from 'react';

const SITE_KEY = '6Lf2m5QrAAAAAI4kwN-6QCcVhzJPSYrwWKdnKFFp';

export default function RegisterWithRecaptchaV3() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    if (!window.grecaptcha) {
      console.log('DEBUG: window.grecaptcha is', window.grecaptcha);
      setMessage('reCAPTCHA not loaded');
      setLoading(false);
      return;
    }
    try {
      window.grecaptcha.ready(async () => {
        try {
          const captchaToken = await window.grecaptcha.execute(SITE_KEY, { action: 'register' });
          console.log('DEBUG: captchaToken =', captchaToken);
          if (!captchaToken) {
            setMessage('Không lấy được captcha token!');
            setLoading(false);
            return;
          }
          const res = await fetch('/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, confirmPassword, captchaToken })
          });
          let data = {};
          try {
            const text = await res.text();
            if (text && text.trim().length > 0) {
              data = JSON.parse(text);
            } else {
              data = {};
            }
          } catch (err) {
            setMessage('Lỗi parse JSON từ server hoặc server trả về rỗng!');
            setLoading(false);
            return;
          }
          setMessage(data.message || (res.ok ? 'Đăng ký thành công!' : 'Đăng ký thất bại!'));
          setLoading(false);
        } catch (err) {
          setMessage('Lỗi khi lấy captcha hoặc gửi đăng ký: ' + err.message);
          setLoading(false);
        }
      });
    } catch (err) {
      setMessage('Lỗi không xác định: ' + err.message);
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: '40px auto', padding: 24, border: '1px solid #eee', borderRadius: 8 }}>
      <h2>Đăng ký (Google reCAPTCHA v3)</h2>
      <form onSubmit={handleSubmit}>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: 8 }} />
        <input type="password" placeholder="Mật khẩu" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', marginBottom: 8 }} />
        <input type="password" placeholder="Nhập lại mật khẩu" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required style={{ width: '100%', marginBottom: 8 }} />
        <button type="submit" disabled={loading} style={{ width: '100%' }}>{loading ? 'Đang đăng ký...' : 'Đăng ký'}</button>
      </form>
      {message && <div style={{ marginTop: 16 }}>{message}</div>}
      {/* Nhúng script reCAPTCHA v3 */}
      <div style={{ display: 'none' }}>
        <div id="recaptcha-v3-script"></div>
      </div>
    </div>
  );
}
 
if (typeof window !== 'undefined' && !document.getElementById('recaptcha-v3-script')) {
  const script = document.createElement('script');
  script.id = 'recaptcha-v3-script';
  script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
  document.head.appendChild(script);
}
