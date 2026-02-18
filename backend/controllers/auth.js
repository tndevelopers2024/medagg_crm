const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const Role = require('../models/Role');
const generateToken = require('../utils/generateToken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');

// @desc    Register user
// @route   POST /api/v1/auth/register
// @access  Public
exports.register = asyncHandler(async (req, res, next) => {
  const { name, email, password, phone, role, address, state } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse('User already exists', 400));
  }

  // Resolve role — accept ObjectId or name string
  let roleId = role;
  if (role && typeof role === 'string' && !role.match(/^[0-9a-fA-F]{24}$/)) {
    const roleDoc = await Role.findOne({ name: new RegExp(`^${role}$`, 'i') });
    if (!roleDoc) {
      return next(new ErrorResponse(`Role "${role}" not found`, 400));
    }
    roleId = roleDoc._id;
  }

  // Create unverified user
  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: roleId,
    address,
    state,
    isVerified: process.env.NODE_ENV === 'development',
    emailVerificationToken: crypto.randomBytes(3).toString('hex'),
    emailVerificationExpire: Date.now() + 30 * 60 * 1000 // 30 minutes
  });

  // Send verification email
  const message = `
    <div style="max-width:600px;margin:0 auto;padding:20px;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;border:1px solid #e0e0e0;border-radius:10px;background:#ffffff;">
      <div style="text-align:center;padding-bottom:20px;">
        <h2 style="color:#4a4a4a;">Welcome to Our Platform, ${user.name}!</h2>
        <p style="color:#888;">Please verify your email address to complete your registration.</p>
      </div>
      <div style="background:#f4f4f4;padding:20px;border-radius:8px;text-align:center;">
        <h3 style="margin:0;color:#333;">Your OTP Code</h3>
        <p style="font-size:28px;font-weight:bold;color:#5D01F2;margin:10px 0;">${user.emailVerificationToken}</p>
        <p style="font-size:14px;color:#777;">This OTP is valid for 30 minutes.</p>
      </div>
      <div style="padding-top:20px;color:#666;">
        <p>If you didn’t create an account, no further action is required.</p>
        <p>Need help? <a href="mailto:support@example.com" style="color:#5D01F2;">Contact our support team</a>.</p>
      </div>
      <hr style="margin:30px 0;border:none;border-top:1px solid #eee;" />
      <footer style="font-size:12px;color:#999;text-align:center;">
        <p>&copy; ${new Date().getFullYear()} convertscantocad.com. All rights reserved.</p>
      </footer>
    </div>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Email Verification',
      message
    });

    res.status(200).json({
      success: true,
      data: {
        email: user.email,
        message: 'Verification email sent'
      }
    });
  } catch (err) {
    await User.findByIdAndDelete(user._id);
    return next(new ErrorResponse('Email could not be sent', 500));
  }
});


// @desc    Verify email
// @route   GET /api/v1/auth/verify-email/:token
// @access  Public
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const { token } = req.params;

  const user = await User.findOne({
    emailVerificationToken: token,
    emailVerificationExpire: { $gt: Date.now() }
  });

  if (!user) {
    return next(new ErrorResponse('Invalid or expired token', 400));
  }

  // Mark user as verified
  user.isVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save();

  // Populate role for token generation
  try { await user.populate('role'); } catch (_) { /* legacy string role */ }

  sendTokenResponse(user, 200, res);
});

// @desc    Resend verification email
// @route   POST /api/v1/auth/resend-verification
// @access  Public
exports.resendVerification = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorResponse('User not found', 404));
  }

  if (user.isVerified) {
    return next(new ErrorResponse('Email already verified', 400));
  }

  // Generate new token
  user.emailVerificationToken = crypto.randomBytes(3).toString('hex');
  user.emailVerificationExpire = Date.now() + 30 * 60 * 1000; // 30 minutes
  await user.save();

  // Send verification email
  const verificationUrl = `${req.protocol}://${req.get('host')}/api/v1/auth/verify-email/${user.emailVerificationToken}`;

  const message = `
    <h1>Email Verification</h1>
    <p>Please verify your email by clicking the link below:</p>
    <a href=${verificationUrl} clicktracking=off>${verificationUrl}</a>
    <p>Or enter this OTP code: ${user.emailVerificationToken}</p>
    <p>This OTP will expire in 30 minutes</p>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Email Verification',
      message: message
    });

    res.status(200).json({
      success: true,
      data: {
        email: user.email,
        message: 'Verification email resent'
      }
    });
  } catch (err) {
    return next(new ErrorResponse('Email could not be sent', 500));
  }
});


// @desc    Login user
// @route   POST /api/v1/auth/login
// @access  Public
// controllers/auth.js
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse('Please provide an email and password', 400));
  }

  // Find user — try to populate role (may fail if role is still a legacy string)
  let user = await User.findOne({ email }).select('+password');
  if (user) {
    try { await user.populate('role'); } catch (_) { /* legacy string role, skip populate */ }
  }

  if (!user) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  if (!user.isVerified && process.env.NODE_ENV !== 'development') {
    return next(new ErrorResponse('Please verify your email first', 401));
  }

  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new ErrorResponse('Invalid credentials', 401));
  }

  sendTokenResponse(user, 200, res);
});

// @desc    Get current logged in user
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id);
  try { await user.populate('role'); } catch (_) { /* legacy string role */ }

  res.status(200).json({
    success: true,
    data: user
  });
});

// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
// @desc    Update user details
// @route   PUT /api/v1/auth/updatedetails
// @access  Private
exports.updateDetails = asyncHandler(async (req, res, next) => {
  const { name, email, phone, state, address } = req.body;

  const fieldsToUpdate = {
    name,
    email,
    phone,
    state,
    address
  };

  const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: user
  });
});



// @desc    Update password
// @route   PUT /api/v1/auth/updatepassword
// @access  Private
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user.id).select('+password');

  // Check current password
  if (!(await user.matchPassword(req.body.currentPassword))) {
    return next(new ErrorResponse('Password is incorrect', 401));
  }

  user.password = req.body.newPassword;
  await user.save();

  try { await user.populate('role'); } catch (_) { /* legacy string role */ }
  sendTokenResponse(user, 200, res);
});

// @desc    Logout user / clear cookie
// @route   GET /api/v1/auth/logout
// @access  Private
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// Get token from model, create cookie and send response
const sendTokenResponse = (user, statusCode, res) => {
  // role is populated as an object (Role doc) or could be an ObjectId
  const roleDoc = user.role && typeof user.role === 'object' ? user.role : null;
  const roleId = roleDoc ? roleDoc._id : user.role;
  const roleName = roleDoc ? roleDoc.name : '';

  // Create token
  const token = generateToken(user._id, roleId, roleName);

  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  };

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
      token,
      role: roleDoc || user.role
    });
};

// @desc    Forgot password - send OTP
// @route   POST /api/v1/auth/forgotpassword
// @access  Public
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const { email } = req.body;

  if (!email) {
    return next(new ErrorResponse('Please provide an email address', 400));
  }

  const user = await User.findOne({ email });

  if (!user) {
    return next(new ErrorResponse('No user found with this email', 404));
  }

  // Generate 6-digit alphanumeric OTP
  const otp = crypto.randomBytes(3).toString('hex').toUpperCase(); // e.g. "A1B2C3"
  user.resetPasswordToken = otp;
  user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 mins

  await user.save();

  const message = `
    <div style="max-width:600px;margin:0 auto;padding:20px;font-family:sans-serif;background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;">
      <h2 style="color:#111827;">Password Reset OTP</h2>
      <p style="color:#374151;">Your One-Time Password (OTP) for password reset is:</p>
      <p style="font-size:28px;font-weight:bold;color:#2563EB;">${otp}</p>
      <p style="color:#6B7280;">This OTP is valid for 30 minutes.</p>
      <hr style="margin:20px 0; border:none; border-top:1px solid #e5e7eb;" />
      <p style="font-size:12px;color:#9CA3AF;">If you did not request a password reset, please ignore this email.</p>
    </div>
  `;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Password Reset OTP',
      message
    });

    // 🔧 Dev-only log (remove in production)
    console.log(`✅ OTP sent to ${email}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent to your email'
    });
  } catch (err) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    return next(new ErrorResponse('Email could not be sent', 500));
  }
});


// @desc    Reset password with OTP
// @route   POST /api/v1/auth/resetpassword
// @access  Public
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  if (!email || !otp || !newPassword) {
    return next(new ErrorResponse('Email, OTP, and new password are required', 400));
  }

  const user = await User.findOne({
    email,
    resetPasswordToken: otp,
    resetPasswordExpire: { $gt: Date.now() }
  });

  if (!user) {
    console.log(`❌ Invalid or expired OTP for email: ${email}`);
    return next(new ErrorResponse('Invalid or expired OTP', 400));
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  await user.save();

  res.status(200).json({
    success: true,
    message: 'Password reset successful'
  });
});
