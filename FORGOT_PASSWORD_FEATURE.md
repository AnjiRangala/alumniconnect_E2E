# Forgot Password Feature

## Overview
A complete password reset system has been implemented allowing users to securely reset their passwords if they forget them.

## Features

### 1. **User Model Update**
- Added `passwordResetToken` field: Stores encrypted reset token
- Added `passwordResetExpires` field: Stores token expiration time (1 hour)

**File**: [server/models/User.js](server/models/User.js)

### 2. **Backend Endpoints**

#### POST `/api/auth/forgot-password`
Initiates password reset process
- **Request**: 
  ```json
  {
    "email": "user@example.com"
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "message": "If email exists, password reset link sent to your email"
  }
  ```
- **Process**:
  1. Validates email exists in database
  2. Generates secure 32-byte random token
  3. Stores SHA-256 hash of token in database
  4. Token valid for 1 hour
  5. Sends reset link via email with token: `{FRONTEND_URL}/#/reset-password?token=...&email=...`
  6. Does NOT reveal if email exists (security best practice)

#### POST `/api/auth/reset-password`
Resets password with valid token
- **Request**: 
  ```json
  {
    "token": "reset_token_from_email",
    "email": "user@example.com",
    "newPassword": "newpassword123"
  }
  ```
- **Response**: 
  ```json
  {
    "success": true,
    "message": "Password reset successful. You can now login with your new password."
  }
  ```
- **Validation**:
  1. Token must be valid (exists in DB and not expired)
  2. Password must be at least 6 characters
  3. On success: Password is hashed and stored, reset token is cleared

**File**: [server/server.js](server/server.js) (Lines 2163-2286)

### 3. **Frontend Pages**

#### ForgotPasswordPage
Email input form for initiating password reset
- Located at: [src/pages/ForgotPasswordPage.jsx](src/pages/ForgotPasswordPage.jsx)
- Features:
  - Email input field
  - Success confirmation showing email sent
  - Back to login link
  - Support contact info

#### ResetPasswordPage
Password reset form with token validation
- Located at: [src/pages/ResetPasswordPage.jsx](src/pages/ResetPasswordPage.jsx)
- Features:
  - Automatic token validation from URL parameters
  - Password and confirm password fields
  - Show/hide password toggle (eye icon)
  - 6 character minimum validation
  - Success confirmation with redirect to login
  - Error handling for expired/invalid tokens

### 4. **Updated Login Pages**

#### StudentLoginPage
- Added "Forgot Password?" link below login button
- **File**: [src/pages/StudentLoginPage.jsx](src/pages/StudentLoginPage.jsx)

#### AlumniLoginPage
- Added "Forgot Password?" link below login button
- **File**: [src/pages/AlumniLoginPage.jsx](src/pages/AlumniLoginPage.jsx)

### 5. **Router Updates**
Updated [src/App.jsx](src/App.jsx) to include:
- `forgot-password` route → ForgotPasswordPage
- `reset-password` route → ResetPasswordPage
- Added to VALID_PAGES set

## User Flow

### Step 1: Initiate Password Reset
1. User clicks "Forgot Password?" on login page
2. Navigates to `/forgot-password` page
3. Enters email address
4. Clicks "Send Reset Link"

### Step 2: Email Verification
1. System sends HTML email with secure reset link
2. Link contains token and email as URL parameters
3. Link expires in 1 hour
4. User receives confirmation on page

### Step 3: Reset Password
1. User clicks link in email
2. Redirected to `/reset-password?token=...&email=...`
3. Page validates token automatically
4. User enters new password (min 6 chars)
5. Confirms password
6. Clicks "Reset Password"

### Step 4: Login
1. Password updated in database
2. User sees success message
3. Redirected to login page
4. User can login with new password

## Security Features

✅ **Token Security**
- 32-byte random tokens (256-bit)
- Tokens stored as SHA-256 hashes (cannot be reversed)
- One-time use only (cleared after use)
- 1-hour expiration

✅ **Password Security**
- Minimum 6 characters
- Hashed using bcryptjs before storage
- Pre-save hook encrypts automatically

✅ **Email Security**
- Does not reveal if email exists (prevents user enumeration)
- HTML email with branded formatting
- Reset link embedded in email

✅ **Rate Limiting Ready**
- Structure supports addition of rate limiting
- Currently no per-IP limits (add if needed)

## Environment Variables

Ensure your `.env` file has:
```
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
FRONTEND_URL=http://localhost:5173  (or production URL)
```

The `FRONTEND_URL` is used to generate reset links in emails.

## Testing

### Test Case 1: Successful Password Reset
1. Create test user: `test@example.com` / `password123`
2. Go to forgot password
3. Enter email
4. Check email (or test endpoint mock)
5. Copy reset link
6. Click link
7. Enter new password: `newpassword456`
8. Confirm password
9. Login with new password

### Test Case 2: Invalid Token
1. Try using an expired/invalid token
2. Should see error: "Invalid or expired reset token"

### Test Case 3: Non-existent Email
1. Enter email that doesn't exist
2. Should see: "If email exists, password reset link sent to your email"
3. No actual email sent (security feature)

### Test Case 4: Mismatched Passwords
1. Enter password and different confirm password
2. Should see error: "Passwords do not match"

## Browser Routes
- Forgot Password: `/#/forgot-password`
- Reset Password: `/#/reset-password?token=ABC123&email=user@example.com`

## Files Modified/Created

### New Files
- [src/pages/ForgotPasswordPage.jsx](src/pages/ForgotPasswordPage.jsx)
- [src/pages/ResetPasswordPage.jsx](src/pages/ResetPasswordPage.jsx)

### Modified Files
- [server/models/User.js](server/models/User.js) - Added reset token fields
- [server/server.js](server/server.js) - Added 2 new API endpoints
- [src/App.jsx](src/App.jsx) - Added routes and imports
- [src/pages/StudentLoginPage.jsx](src/pages/StudentLoginPage.jsx) - Added forgot password link
- [src/pages/AlumniLoginPage.jsx](src/pages/AlumniLoginPage.jsx) - Added forgot password link

## Future Enhancements

- [ ] Rate limiting (prevent brute force attempts)
- [ ] Email confirmation requirement
- [ ] Password strength validation
- [ ] Security questions as backup
- [ ] SMS verification option
- [ ] Logging of password reset attempts
